import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { continueHistoryJob } from './continueHistoryJob';
import { startHistoryJob } from './startHistoryJob';
import { aFilmPlay, anEpisodePlay } from './testing/aTraktPlay';
import { traktAnswers } from './testing/traktAnswers';
import { traktLibrary } from './testing/traktLibrary';

const NOW = new Date('2026-10-05T12:00:00.000Z');

const connected = {
  settings: { traktClientId: 'client' },
  connections: { 'p1:trakt': { accessToken: 't', account: null } },
};

describe('importing a Trakt history', () => {
  it('marks each play the library has watched at the time it was watched, skipping what is already finished', async () => {
    const { host, stored } = aHost({
      ...connected,
      answers: traktAnswers([
        aFilmPlay({ watchedAt: '2026-09-20T20:00:00.000Z' }),
        anEpisodePlay({ number: 2, watchedAt: '2026-09-19T20:00:00.000Z' }),
        anEpisodePlay({ number: 1 }),
        aFilmPlay({ trakt: 9, title: 'Nowhere', tmdb: 1, imdb: null }),
        aFilmPlay({ trakt: 9, title: 'Nowhere', tmdb: 1, imdb: null }),
      ]),
      library: traktLibrary(),
      finished: ['e1'],
    });

    await startHistoryJob(host, 'import', 'p1', null, NOW);

    const job = await continueHistoryJob(host, 'import', 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls).toEqual([
      ['p1', 'film', '2026-09-20T20:00:00.000Z'],
      ['p1', 'e2', '2026-09-19T20:00:00.000Z'],
    ]);
    expect(job).toMatchObject({
      plays: 5,
      matched: 3,
      marked: 2,
      unmatched: ['Nowhere (2021)'],
      finishedAt: NOW.toISOString(),
    });
    expect(stored.get('import:p1')).toEqual(job);
    expect(host.notifications.send).toHaveBeenCalledWith('p1', {
      title: 'Trakt history imported',
      body: 'Found 3 of 5 plays in your library and marked 2 watched.',
    });
  });

  it('asks Trakt only for plays up to when it started, and from a time for a sync', async () => {
    const { host } = aHost({ ...connected, answers: traktAnswers([]) });

    await startHistoryJob(host, 'sync', 'p1', '2026-10-04T11:00:00.000Z', NOW);
    await continueHistoryJob(host, 'sync', 'p1', NOW);

    expect(host.http.fetch).toHaveBeenCalledWith(
      'https://api.trakt.tv/sync/history?page=1&limit=100&end_at=2026-10-05T12%3A00%3A00.000Z&start_at=2026-10-04T11%3A00%3A00.000Z',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer t',
          'trakt-api-key': 'client',
          'trakt-api-version': '2',
        }),
      }),
    );
    expect(host.notifications.send).not.toHaveBeenCalled();
  });

  it('finds a programme by its episodes’ IMDb id, or by its title and year, when TMDB does not know it', async () => {
    const { host } = aHost({
      ...connected,
      answers: traktAnswers([
        anEpisodePlay({ tmdb: null, number: 3 }),
        aFilmPlay({ trakt: 2, title: 'Quiet Fields', year: 2019, tmdb: null, imdb: null }),
      ]),
      library: [
        ...traktLibrary(),
        aMedia({ id: 'quiet', kind: 'film', title: 'Quiet Fields', year: 2020 }),
      ],
    });

    await startHistoryJob(host, 'import', 'p1', null, NOW);
    await continueHistoryJob(host, 'import', 'p1', NOW);

    expect(host.viewing.markWatched.mock.calls.map(([, mediaId]) => mediaId)).toEqual([
      'e3',
      'quiet',
    ]);
  });

  it('works through a long history a page at a time, looking each show up once a run', async () => {
    const plays = Array.from({ length: 150 }, (_, at) => anEpisodePlay({ number: (at % 3) + 1 }));
    const { host } = aHost({ ...connected, answers: traktAnswers(plays), library: traktLibrary() });

    await startHistoryJob(host, 'import', 'p1', null, NOW);

    expect(await continueHistoryJob(host, 'import', 'p1', NOW, 0)).toMatchObject({
      page: 2,
      pages: 2,
      plays: 100,
      finishedAt: null,
    });
    expect(host.library.findByExternalId).toHaveBeenCalledTimes(1);
    expect(await continueHistoryJob(host, 'import', 'p1', NOW, 0)).toMatchObject({
      plays: 150,
      finishedAt: NOW.toISOString(),
    });
    expect(host.viewing.markWatched).toHaveBeenCalledTimes(3);
  });

  it('does nothing without an import or without Trakt connected', async () => {
    const { host } = aHost({ answers: traktAnswers([aFilmPlay()]) });

    expect(await continueHistoryJob(host, 'import', 'p1', NOW)).toBeNull();

    await startHistoryJob(host, 'import', 'p1', null, NOW);

    expect(await continueHistoryJob(host, 'import', 'p1', NOW)).toMatchObject({ page: 1 });
    expect(host.http.fetch).not.toHaveBeenCalled();
  });
});
