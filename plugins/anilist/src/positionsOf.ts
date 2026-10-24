import type { MediaRef } from '@ValenceSDK/host/ValenceHost';

/**
 * Where each of a programme's episodes falls when the whole show is counted from its first
 * episode, as the lists count across seasons, and where each season starts. A season numbered
 * from 1 starts after the last episode number of the one before; one whose numbers carry on from
 * the seasons before it is numbered across the whole show already. Counted from episode numbers
 * rather than files, so a missing file shifts nothing. Specials are left out, and so is any season
 * after one the library doesn't have, whose start can't be known.
 *
 * @param episodes - The programme's episodes as the library holds them.
 * @returns Each episode's place, counted from 0, by its id, and the place each season starts at.
 */
const positionsOf = (
  episodes: readonly MediaRef[],
): { at: Map<string, number>; starts: number[] } => {
  const counted = episodes.filter(
    (episode) => (episode.seasonNumber ?? 1) > 0 && episode.episodeNumber !== null,
  );
  const range = new Map<number, { first: number; last: number }>();

  for (const episode of counted) {
    const season = episode.seasonNumber ?? 1;
    const number = episode.episodeNumber ?? 0;
    const known = range.get(season);

    range.set(season, {
      first: Math.min(known?.first ?? number, number),
      last: Math.max(known?.last ?? number, number),
    });
  }

  const placeOf = new Map<number, (number: number) => number>();
  const starts: number[] = [];
  let start = 0;

  for (let season = 1; range.has(season); season += 1) {
    const { first, last } = range.get(season) ?? { first: 1, last: 0 };
    const isAcross = season > 1 && first > start;
    const seasonStart = start;

    placeOf.set(season, isAcross ? (number) => number - 1 : (number) => seasonStart + number - 1);
    starts.push(isAcross ? first - 1 : start);
    start = isAcross ? last : start + last;
  }

  return {
    at: new Map(
      counted.flatMap((episode) => {
        const place = placeOf.get(episode.seasonNumber ?? 1);

        return place === undefined
          ? []
          : [[episode.id, place(episode.episodeNumber ?? 1)] as const];
      }),
    ),
    starts,
  };
};

export { positionsOf };
