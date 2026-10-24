import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import { aMedia } from '@Shared/testing/aMedia';

/**
 * A library holding one made-up anime as a single programme of two twelve-episode seasons, which
 * the lists count as two entries, for import tests.
 *
 * @returns The library.
 */
const exampleLibrary = (): MediaRef[] => [
  aMedia({
    id: 'example',
    title: 'Example Quest',
    year: 2023,
    externalIds: { anilist: '1001' },
  }),
  ...[1, 2].flatMap((season) =>
    Array.from({ length: 12 }, (_, at) =>
      aMedia({
        id: `s${season.toString()}e${(at + 1).toString()}`,
        title: `Episode ${(at + 1).toString()}`,
        kind: 'episode',
        seriesId: 'example',
        seasonNumber: season,
        episodeNumber: at + 1,
      }),
    ),
  ),
];

export { exampleLibrary };
