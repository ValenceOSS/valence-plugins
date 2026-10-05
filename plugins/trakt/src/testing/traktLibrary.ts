import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import { aMedia } from '@Shared/testing/aMedia';

/**
 * A library holding one film and one programme with its first season, for Trakt tests.
 *
 * @returns The library.
 */
const traktLibrary = (): MediaRef[] => [
  aMedia({
    id: 'film',
    kind: 'film',
    title: 'The Long Walk Home',
    year: 2021,
    externalIds: { tmdb: '9001', imdb: 'tt1000001' },
  }),
  aMedia({ id: 'harbour', title: 'Harbour Lights', year: 2024, externalIds: { tmdb: '4242' } }),
  ...[1, 2, 3].map((number) =>
    aMedia({
      id: `e${number.toString()}`,
      kind: 'episode',
      title: `Episode ${number.toString()}`,
      seriesId: 'harbour',
      seasonNumber: 1,
      episodeNumber: number,
      externalIds: { imdb: 'tt2000002' },
    }),
  ),
];

export { traktLibrary };
