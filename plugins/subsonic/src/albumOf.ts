import type { MediaDetails, MediaRef } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { EPOCH } from './EPOCH';

/**
 * An album as a Subsonic app expects one, with how many songs it holds and how long they run.
 *
 * @param album - The album's details.
 * @param songs - What it holds.
 * @returns The album.
 */
const albumOf = (album: MediaDetails, songs: readonly MediaRef[]): SubsonicBody => ({
  id: album.id,
  name: album.title,
  artist: album.artist,
  artistId: album.artistId,
  coverArt: album.id,
  songCount: songs.length,
  duration: Math.round(songs.reduce((all, song) => all + (song.durationSeconds ?? 0), 0)),
  year: album.year,
  genre: album.genres[0] ?? null,
  created: album.addedAt ?? EPOCH,
});

export { albumOf };
