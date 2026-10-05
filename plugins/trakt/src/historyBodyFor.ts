import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';

type Ids = { tmdb?: number; imdb?: string };

/**
 * A film or show by its title, for Trakt to match where the library has no ids for it.
 *
 * @param media - The film or programme.
 * @returns Its title, and its year where known.
 */
const titleOf = (media: MediaRef): { title: string; year?: number } => ({
  title: media.title,
  ...(media.year === null ? {} : { year: media.year }),
});

/**
 * The ids Trakt can find a film or show by, from what the library knows.
 *
 * @param media - The film or programme.
 * @param imdb - Its IMDb id, where it is known some other way.
 * @returns The ids, or nothing where it has none.
 */
const idsOf = (media: MediaRef, imdb: string | undefined = media.externalIds.imdb): Ids | null => {
  const tmdb = Number(media.externalIds.tmdb);
  const ids: Ids = {
    ...(Number.isInteger(tmdb) && tmdb > 0 ? { tmdb } : {}),
    ...(imdb === undefined || imdb === '' ? {} : { imdb }),
  };

  return Object.keys(ids).length === 0 ? null : ids;
};

/**
 * What to post to Trakt's history for a film or episode somebody finished: the film by its ids,
 * or the episode by its show's ids and its season and episode numbers, since the library keeps no
 * ids for episodes themselves, taking the programme's IMDb id from the episode where the programme
 * has none. Without ids, the title and year, which Trakt matches on next.
 *
 * @param valence - The host.
 * @param media - What was finished.
 * @param watchedAt - When.
 * @returns The body, or nothing where it is not a film or a numbered episode.
 */
const historyBodyFor = async (
  valence: ValenceHost,
  media: MediaRef,
  watchedAt: string,
): Promise<object | null> => {
  if (media.kind === 'film') {
    const ids = idsOf(media);

    return {
      movies: [
        {
          ...(ids === null ? titleOf(media) : { ids }),
          watched_at: watchedAt,
        },
      ],
    };
  }

  if (
    media.kind !== 'episode' ||
    media.seriesId === null ||
    media.seasonNumber === null ||
    media.episodeNumber === null
  ) {
    return null;
  }

  const series = await valence.library.get(media.seriesId);

  if (series === null) {
    return null;
  }

  const ids = idsOf(series, series.externalIds.imdb ?? media.externalIds.imdb);

  return {
    shows: [
      {
        ...(ids === null ? titleOf(series) : { ids }),
        seasons: [
          {
            number: media.seasonNumber,
            episodes: [{ number: media.episodeNumber, watched_at: watchedAt }],
          },
        ],
      },
    ],
  };
};

export { historyBodyFor };
