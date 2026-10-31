import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { AnimeEntry } from './AnimeEntry';
import { findSeriesFor } from './findSeriesFor';
import type { Season } from './Season';

type Match = {
  series: MediaRef;
  seasons: { season: Season; offset: number }[];
};

/**
 * Finds the programme a list entry belongs to, and where in it the entry starts. The entry's own
 * ids are tried first, then each season before it in turn, so a library that keeps a later season
 * as a programme of its own is matched there, and one that keeps the whole show is matched by the
 * nearest season it knows, with the entry starting after the episodes of the seasons between. Only
 * where no id matches is a title tried: the first season's, since a later season often shares it,
 * then the entry's own, for a library that keeps that season apart.
 *
 * @param valence - The host.
 * @param profileId - Whose list it is.
 * @param entry - The list entry.
 * @param chain - The entry and the seasons before it, nearest first, where AniList knows them.
 * @returns The programme, and each season from the one it matched up to the entry with where it
 *   starts, or nothing where it can't be matched or placed.
 */
const matchEntry = async (
  valence: ValenceHost,
  profileId: string,
  entry: AnimeEntry,
  chain: readonly Season[] | undefined,
): Promise<Match | null> => {
  const own: Season = {
    anilistId: entry.anilistId ?? chain?.[0]?.anilistId ?? '',
    malId: entry.malId ?? chain?.[0]?.malId ?? null,
    episodes: entry.episodes ?? chain?.[0]?.episodes ?? null,
    titles: entry.titles,
    year: entry.year,
  };
  const seasons: Season[] = [own, ...(chain?.slice(1) ?? [])];
  const placedFrom = (at: number, series: MediaRef): Match | null => {
    const before = seasons.slice(0, at + 1).reverse();
    const placed: { season: Season; offset: number }[] = [];
    let offset = 0;

    for (const [index, season] of before.entries()) {
      placed.push({ season, offset });

      if (index < before.length - 1) {
        if (season.episodes === null) {
          return null;
        }

        offset += season.episodes;
      }
    }

    return { series, seasons: placed };
  };

  for (const [at, season] of seasons.entries()) {
    const series = await findSeriesFor(
      valence,
      profileId,
      { ...season, anilistId: season.anilistId === '' ? null : season.anilistId },
      false,
    );

    if (series !== null) {
      return placedFrom(at, series);
    }
  }

  const first = seasons[0];
  const root = seasons.at(-1);
  const byFirstTitle =
    root === undefined || seasons.length < 2
      ? null
      : await findSeriesFor(valence, profileId, { ...root, anilistId: null, malId: null });

  if (byFirstTitle !== null) {
    return placedFrom(seasons.length - 1, byFirstTitle);
  }

  const byOwnTitle =
    first === undefined
      ? null
      : await findSeriesFor(valence, profileId, { ...first, anilistId: null, malId: null });

  return byOwnTitle === null ? null : placedFrom(0, byOwnTitle);
};

export type { Match };

export { matchEntry };
