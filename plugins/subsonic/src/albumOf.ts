import type { MediaDetails, MediaRef } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';

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
  created: album.addedAt ?? '1970-01-01T00:00:00.000Z',
});

export { albumOf };
