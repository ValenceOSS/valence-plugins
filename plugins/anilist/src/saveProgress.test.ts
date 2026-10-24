import { aHost } from '@Shared/testing/aHost';
import { saveProgress } from './saveProgress';
import { aniListAnswers } from './testing/aniListAnswers';

const sentTo = (host: ReturnType<typeof aHost>['host']) =>
  host.http.fetch.mock.calls
    .map(([, init]) => init?.body ?? '')
    .filter((body) => body.includes('SaveMediaListEntry'))
    .map((body) => JSON.parse(body).variables);

describe('saveProgress', () => {
  it('reads the AniList entry first, and completes the show at its last episode', async () => {
    const { host } = aHost({
      answers: aniListAnswers([], {
        states: { 1001: { status: 'CURRENT', progress: 11, repeat: 0 } },
      }),
    });

    expect(await saveProgress(host, 'anilist', 'token', '1001', 12, 12)).toBe(true);
    expect(sentTo(host)).toEqual([{ media: 1001, progress: 12, status: 'COMPLETED', repeat: 0 }]);
  });

  it('leaves a list that is already further on, or a completed show watched again partway', async () => {
    const ahead = aHost({
      answers: aniListAnswers([], {
        states: { 1001: { status: 'CURRENT', progress: 8, repeat: 0 } },
      }),
    });
    const done = aHost({
      answers: aniListAnswers([], {
        states: { 1001: { status: 'COMPLETED', progress: 12, repeat: 0 } },
      }),
    });

    expect(await saveProgress(ahead.host, 'anilist', 'token', '1001', 3, 12)).toBe(false);
    expect(await saveProgress(done.host, 'anilist', 'token', '1001', 3, 12)).toBe(false);
    expect([...sentTo(ahead.host), ...sentTo(done.host)]).toEqual([]);
  });

  it('marks a rewatch on MyAnimeList the way it keeps one', async () => {
    const { host } = aHost({
      answers: (_url, init) =>
        init.method === 'PATCH'
          ? { status: 200, text: '{}' }
          : {
              status: 200,
              text: JSON.stringify({
                num_episodes: 12,
                my_list_status: {
                  status: 'completed',
                  num_episodes_watched: 12,
                  num_times_rewatched: 1,
                },
              }),
            },
    });

    expect(await saveProgress(host, 'mal', 'token', '2001', 1, null)).toBe(true);
    expect(host.http.fetch).toHaveBeenLastCalledWith(
      'https://api.myanimelist.net/v2/anime/2001/my_list_status',
      {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer token',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'status=completed&num_watched_episodes=1&is_rewatching=true&num_times_rewatched=1',
      },
    );
  });

  it('says which service refused', async () => {
    const { host } = aHost({ answers: () => ({ status: 500, text: '' }) });

    await expect(saveProgress(host, 'mal', 'token', '1', 1, 2)).rejects.toThrow(
      'MyAnimeList answered 500',
    );
    await expect(saveProgress(host, 'anilist', 'token', '1', 1, 2)).rejects.toThrow(
      'AniList answered 500',
    );
  });

  it('leaves MyAnimeList’s rewatch count alone where it wasn’t read', async () => {
    const { host } = aHost({
      answers: (_url, init) =>
        init.method === 'PATCH'
          ? { status: 200, text: '{}' }
          : {
              status: 200,
              text: JSON.stringify({
                num_episodes: 12,
                my_list_status: { status: 'watching', num_episodes_watched: 3 },
              }),
            },
    });

    await saveProgress(host, 'mal', 'token', '2001', 4, null);

    expect(host.http.fetch.mock.calls[0]?.[0]).toContain('my_list_status{');
    expect(host.http.fetch.mock.calls[1]?.[1]?.body).toBe(
      'status=watching&num_watched_episodes=4&is_rewatching=false',
    );
  });
});
