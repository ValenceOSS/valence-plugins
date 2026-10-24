import { aHost } from '@Shared/testing/aHost';
import { pushProgress } from './pushProgress';
import { aniListAnswers } from './testing/aniListAnswers';
import { exampleLibrary } from './testing/exampleLibrary';

const finished = (mediaId: string) => ({
  topic: 'playback.finished',
  occurredAt: '2026-09-28T12:00:00.000Z',
  profileId: 'p1',
  mediaId,
  positionSeconds: 1400,
  durationSeconds: 1400,
});

const LINK = {
  entries: [
    { anilistId: '1001', malId: '2001', title: 'Example Quest', offset: 0, episodes: 12 },
    { anilistId: '1002', malId: '2002', title: 'Example Quest 2', offset: 12, episodes: 12 },
  ],
};

describe('pushProgress', () => {
  it('tells each connected list about the episode, on the entry for its season', async () => {
    const aniList = aniListAnswers([]);
    const { host, stored } = aHost({
      connections: {
        'p1:anilist': { accessToken: 'a', account: null },
        'p1:mal': { accessToken: 'm', account: null },
      },
      library: exampleLibrary(),
      answers: (url, init) =>
        url.includes('myanimelist')
          ? { status: 200, text: init.method === 'PATCH' ? '{}' : JSON.stringify({}) }
          : aniList(url, init),
    });

    stored.set('link:p1:example', LINK);

    expect(await pushProgress(host, finished('s2e1'))).toBe(2);

    const saved = host.http.fetch.mock.calls.flatMap(([url, init]) =>
      init?.body?.includes('SaveMediaListEntry') === true
        ? [JSON.parse(init.body).variables]
        : init?.method === 'PATCH'
          ? [url, init?.body]
          : [],
    );

    expect(saved).toEqual([
      { media: 1002, progress: 1, status: 'CURRENT', repeat: 0 },
      'https://api.myanimelist.net/v2/anime/2002/my_list_status',
      'status=watching&num_watched_episodes=1&is_rewatching=false&num_times_rewatched=0',
    ]);
  });

  it('still tells one list when Valence can’t renew the other’s connection just then', async () => {
    const { host, stored } = aHost({
      connections: {
        'p1:anilist': { accessToken: 'a', account: null },
        'p1:mal': { accessToken: 'm', account: null },
      },
      library: exampleLibrary(),
      answers: aniListAnswers([]),
    });
    const kept = host.accounts.connection.getMockImplementation();

    host.accounts.connection.mockImplementation((profileId: string, provider: string) =>
      provider === 'mal'
        ? Promise.reject(new Error('MyAnimeList could not renew it (503)'))
        : (kept?.(profileId, provider) ?? Promise.resolve(null)),
    );
    stored.set('link:p1:example', LINK);

    expect(await pushProgress(host, finished('s2e1'))).toBe(1);
    expect(host.http.fetch.mock.calls.some(([url]) => String(url).includes('myanimelist'))).toBe(
      false,
    );
    expect(host.log.warn).toHaveBeenCalledWith('Could not renew a list’s connection just now', {
      profile: 'p1',
      provider: 'mal',
      problem: 'MyAnimeList could not renew it (503)',
    });
  });

  it('tells nobody about an episode no import matched, or when the viewer turned it off', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
      library: exampleLibrary(),
    });

    expect(await pushProgress(host, finished('s1e4'))).toBe(0);

    stored.set('link:p1:example', LINK);
    stored.set('preferences:p1', { twoWay: false });

    expect(await pushProgress(host, finished('s1e4'))).toBe(0);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });

  it('skips a list the entry has no id on, an episode past every entry, and other events', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:mal': { accessToken: 'm', account: null } },
      library: exampleLibrary(),
    });

    stored.set('link:p1:example', {
      entries: [
        { anilistId: '1001', malId: null, title: 'Example Quest', offset: 0, episodes: 12 },
      ],
    });

    expect(await pushProgress(host, finished('s1e4'))).toBe(0);
    expect(await pushProgress(host, finished('s2e4'))).toBe(0);
    expect(await pushProgress(host, { ...finished('s1e4'), topic: 'playback.started' })).toBe(0);
    expect(await pushProgress(host, { ...finished('s1e4'), profileId: null })).toBe(0);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });
});
