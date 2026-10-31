import type { SubsonicBody } from './SubsonicBody';

/**
 * An album in the shape the older, folder-based half of the Subsonic API gives one: a folder under
 * its artist, titled rather than named, which `getAlbumList`, `search2` and `getMusicDirectory`
 * answer with.
 *
 * @param album - The album, as `albumOf` gives it.
 * @returns The folder.
 */
const folderOf = (album: SubsonicBody): SubsonicBody => ({
  id: album['id'] ?? null,
  parent: album['artistId'] ?? null,
  isDir: true,
  title: album['name'] ?? null,
  album: album['name'] ?? null,
  artist: album['artist'] ?? null,
  year: album['year'] ?? null,
  genre: album['genre'] ?? null,
  coverArt: album['coverArt'] ?? null,
  songCount: album['songCount'] ?? null,
  duration: album['duration'] ?? null,
  created: album['created'] ?? null,
});

export { folderOf };
