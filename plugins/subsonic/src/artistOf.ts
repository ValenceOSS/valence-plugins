import type { MediaRef } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';

/**
 * An artist as a Subsonic app expects one, with the address of their picture.
 *
 * @param artist - The artist.
 * @param albumCount - How many albums they have, where it is known.
 * @returns The artist.
 */
const artistOf = (artist: MediaRef, albumCount: number | null = null): SubsonicBody => ({
  id: artist.id,
  name: artist.title,
  coverArt: `ar-${artist.id}`,
  albumCount,
  musicBrainzId: artist.externalIds.musicbrainz ?? null,
});

export { artistOf };
