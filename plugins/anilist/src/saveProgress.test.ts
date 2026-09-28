import { aHost } from '@Shared/testing/aHost';
import { saveProgress } from './saveProgress';

describe('saveProgress', () => {
  it('tells AniList the progress, completing the show at its last episode', async () => {
    const { host } = aHost({ answers: () => ({ status: 200, text: '{}' }) });

    await saveProgress(host, 'anilist', 'token', '154587', 28, 28);

    const body = JSON.parse(host.http.fetch.mock.calls[0]?.[1]?.body ?? '{}');

    expect(body.variables).toEqual({ media: 154_587, progress: 28, status: 'COMPLETED' });
  });

  it('tells MyAnimeList the progress as a form', async () => {
    const { host } = aHost({ answers: () => ({ status: 200, text: '{}' }) });

    await saveProgress(host, 'mal', 'token', '52991', 4, null);

    expect(host.http.fetch).toHaveBeenCalledWith(
      'https://api.myanimelist.net/v2/anime/52991/my_list_status',
      {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer token',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'num_watched_episodes=4&status=watching',
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
});
