/**
 * One play of a film in a Trakt history, as Trakt sends it.
 *
 * @param changes - What this test changes.
 * @returns The play.
 */
const aFilmPlay = (
  changes: {
    trakt?: number;
    title?: string;
    year?: number;
    tmdb?: number | null;
    imdb?: string | null;
    watchedAt?: string;
  } = {},
) => ({
  id: 1,
  watched_at: changes.watchedAt ?? '2026-09-20T20:00:00.000Z',
  action: 'watch',
  type: 'movie',
  movie: {
    title: changes.title ?? 'The Long Walk Home',
    year: changes.year ?? 2021,
    ids: {
      trakt: changes.trakt ?? 501,
      slug: 'the-long-walk-home-2021',
      imdb: changes.imdb === undefined ? 'tt1000001' : changes.imdb,
      tmdb: changes.tmdb === undefined ? 9001 : changes.tmdb,
    },
  },
});

/**
 * One play of an episode in a Trakt history, as Trakt sends it.
 *
 * @param changes - What this test changes.
 * @returns The play.
 */
const anEpisodePlay = (
  changes: {
    season?: number;
    number?: number;
    trakt?: number;
    title?: string;
    tmdb?: number | null;
    imdb?: string | null;
    watchedAt?: string;
  } = {},
) => ({
  id: 2,
  watched_at: changes.watchedAt ?? '2026-09-21T20:00:00.000Z',
  action: 'scrobble',
  type: 'episode',
  episode: {
    season: changes.season ?? 1,
    number: changes.number ?? 1,
    title: 'Pilot',
    ids: { trakt: 7001, tvdb: 8001, imdb: null, tmdb: 6001 },
  },
  show: {
    title: changes.title ?? 'Harbour Lights',
    year: 2024,
    ids: {
      trakt: changes.trakt ?? 601,
      slug: 'harbour-lights',
      tvdb: 8000,
      imdb: changes.imdb === undefined ? 'tt2000002' : changes.imdb,
      tmdb: changes.tmdb === undefined ? 4242 : changes.tmdb,
    },
  },
});

export { aFilmPlay, anEpisodePlay };
