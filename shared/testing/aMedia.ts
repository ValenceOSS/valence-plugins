import type { MediaRef } from '@ValenceSDK/host/ValenceHost';

/**
 * Something in a test library.
 *
 * @param changes - What this test changes.
 * @returns The item.
 */
const aMedia = (changes: Partial<MediaRef> & Pick<MediaRef, 'id' | 'title'>): MediaRef => ({
  kind: 'series',
  year: null,
  seriesId: null,
  seasonNumber: null,
  episodeNumber: null,
  durationSeconds: null,
  artist: null,
  album: null,
  externalIds: {},
  ...changes,
});

export { aMedia };
