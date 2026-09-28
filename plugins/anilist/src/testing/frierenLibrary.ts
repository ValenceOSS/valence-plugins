import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import { aMedia } from '@Shared/testing/aMedia';

/**
 * A library holding one anime and its first four episodes, for import tests.
 *
 * @returns The library.
 */
const frierenLibrary = (): MediaRef[] => [
  aMedia({
    id: 'frieren',
    title: 'Frieren: Beyond Journey’s End',
    year: 2023,
    externalIds: { anilist: '154587' },
  }),
  ...[1, 2, 3, 4].map((number) =>
    aMedia({
      id: `e${number.toString()}`,
      title: `Episode ${number.toString()}`,
      kind: 'episode',
      seriesId: 'frieren',
      seasonNumber: 1,
      episodeNumber: number,
    }),
  ),
];

export { frierenLibrary };
