import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { findTitleFor } from './findTitleFor';
import type { TraktWatch } from './TraktWatch';

/** What one run has already looked up, so a show watched a hundred times is found once. */
type Lookups = {
  titles: Map<string, string | null>;
  episodes: Map<string, MediaRef[]>;
};

/**
 * Finds the film or episode in the library that a play on Trakt was of.
 *
 * @param valence - The host.
 * @param profileId - Whose library it is looked for in.
 * @param watch - The play.
 * @param lookups - What this run has already looked up, added to as it goes.
 * @returns The library's id for it, or nothing where the library does not have it.
 */
const findWatchFor = async (
  valence: ValenceHost,
  profileId: string,
  watch: TraktWatch,
  lookups: Lookups,
): Promise<string | null> => {
  const title = watch.kind === 'film' ? watch : watch.show;
  const key = `${watch.kind}:${title.traktId}`;
  const known = lookups.titles.get(key);
  const id =
    known === undefined
      ? await findTitleFor(valence, profileId, title, watch.kind === 'film' ? 'film' : 'series')
      : known;

  lookups.titles.set(key, id);

  if (watch.kind === 'film' || id === null) {
    return id;
  }

  const episodes = lookups.episodes.get(id) ?? (await valence.library.episodes(id, { profileId }));

  lookups.episodes.set(id, episodes);

  return (
    episodes.find(
      (episode) => episode.seasonNumber === watch.season && episode.episodeNumber === watch.number,
    )?.id ?? null
  );
};

export type { Lookups };

export { findWatchFor };
