import { aHost } from '@Shared/testing/aHost';
import { pushProgress } from './pushProgress';

const finished = {
  topic: 'playback.finished',
  occurredAt: '2026-09-28T12:00:00.000Z',
  profileId: 'p1',
  mediaId: 'e4',
  positionSeconds: 1400,
  durationSeconds: 1400,
};

describe('pushProgress', () => {
  it('tells every connected list how far through the show the viewer now is', async () => {
    const { host, stored } = aHost({
      connections: {
        'p1:anilist': { accessToken: 'a', account: null },
        'p1:mal': { accessToken: 'm', account: null },
      },
      answers: () => ({ status: 200, text: '{}' }),
    });

    stored.set('episode:p1:e4', { anilistId: '154587', malId: '52991', number: 4, episodes: 28 });

    expect(await pushProgress(host, finished)).toBe(2);
    expect(host.http.fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://graphql.anilist.co',
      'https://api.myanimelist.net/v2/anime/52991/my_list_status',
    ]);
  });

  it('tells nobody about an episode no import matched, or when the viewer turned it off', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:anilist': { accessToken: 'a', account: null } },
    });

    expect(await pushProgress(host, finished)).toBe(0);

    stored.set('episode:p1:e4', { anilistId: '154587', malId: null, number: 4, episodes: 28 });
    stored.set('preferences:p1', { twoWay: false });

    expect(await pushProgress(host, finished)).toBe(0);
    expect(host.http.fetch).not.toHaveBeenCalled();
  });

  it('skips a list the episode has no id on, and ignores other events', async () => {
    const { host, stored } = aHost({
      connections: { 'p1:mal': { accessToken: 'm', account: null } },
    });

    stored.set('episode:p1:e4', { anilistId: '154587', malId: null, number: 4, episodes: 28 });

    expect(await pushProgress(host, finished)).toBe(0);
    expect(await pushProgress(host, { ...finished, topic: 'playback.started' })).toBe(0);
    expect(await pushProgress(host, { ...finished, profileId: null })).toBe(0);
  });
});
