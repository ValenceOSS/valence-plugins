import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import { aMedia } from '@Shared/testing/aMedia';

/**
 * A library holding a few songs, for scrobbling and playlist tests.
 *
 * @returns The library.
 */
const musicLibrary = (): MediaRef[] => [
  aMedia({
    id: 's1',
    kind: 'track',
    title: 'Northern Line',
    artist: 'The Signal Box',
    album: 'Platforms',
    durationSeconds: 215,
  }),
  aMedia({
    id: 's2',
    kind: 'track',
    title: 'Low Tide',
    artist: 'Mara Quill',
    album: 'Coastal',
    durationSeconds: 189,
  }),
  aMedia({
    id: 's3',
    kind: 'track',
    title: 'Paper Kites',
    artist: 'Odell Finch',
    album: 'Paper Kites',
    durationSeconds: 240,
  }),
  aMedia({ id: 'jingle', kind: 'track', title: 'Ident', artist: 'Station', durationSeconds: 12 }),
  aMedia({ id: 'film', kind: 'film', title: 'A Film' }),
];

export { musicLibrary };
