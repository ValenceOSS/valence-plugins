import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { normaliseTitle } from '@Shared/normaliseTitle';
import type { AnimeEntry } from './AnimeEntry';

/**
 * Finds the programme in the library that a list entry is about: by its AniList or MyAnimeList id
 * where the library knows one, and otherwise by a title that matches exactly once normalised, in a
 * year no more than one out, so a similar name is never mistaken for the show.
 *
 * @param valence - The host.
 * @param entry - The list entry.
 * @returns The programme, or nothing where the library has no clear match.
 */
const findSeriesFor = async (valence: ValenceHost, entry: AnimeEntry): Promise<MediaRef | null> => {
  const byId = [
    ...(entry.anilistId === null
      ? []
      : await valence.library.findByExternalId('anilist', entry.anilistId)),
    ...(entry.malId === null ? [] : await valence.library.findByExternalId('mal', entry.malId)),
  ].find((media) => media.kind === 'series');

  if (byId !== undefined) {
    return byId;
  }

  const wanted = new Set(entry.titles.map(normaliseTitle));

  for (const title of entry.titles.slice(0, 3)) {
    const matches = (await valence.library.search(title, ['series'])).filter(
      (media) =>
        wanted.has(normaliseTitle(media.title)) &&
        (entry.year === null || media.year === null || Math.abs(media.year - entry.year) <= 1),
    );

    if (matches.length === 1) {
      return matches[0] ?? null;
    }
  }

  return null;
};

export { findSeriesFor };
