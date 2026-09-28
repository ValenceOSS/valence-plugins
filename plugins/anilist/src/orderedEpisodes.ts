import type { MediaRef } from '@ValenceSDK/host/ValenceHost';

/**
 * A programme's episodes in the order they are counted on an anime list: season by season, leaving
 * out specials, which lists count separately.
 *
 * @param episodes - The programme's episodes as the library holds them.
 * @returns Them in watching order.
 */
const orderedEpisodes = (episodes: readonly MediaRef[]): MediaRef[] =>
  episodes
    .filter((episode) => (episode.seasonNumber ?? 1) > 0 && episode.episodeNumber !== null)
    .sort(
      (left, right) =>
        (left.seasonNumber ?? 1) - (right.seasonNumber ?? 1) ||
        (left.episodeNumber ?? 0) - (right.episodeNumber ?? 0),
    );

export { orderedEpisodes };
