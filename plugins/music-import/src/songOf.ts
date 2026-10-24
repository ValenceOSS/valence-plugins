import type { MissingSong } from '@ValenceSDK/host/ValenceHost';
import { cutTo } from '@Shared/cutTo';
import type { ImportedTrack } from './ImportedTrack';

const MOST_CHARACTERS = 300;

const MOST_ISRC_CHARACTERS = 20;

/**
 * A song from another service as Valence takes it, within the lengths the host accepts: trimmed,
 * cut short where too long, an unnamed artist called unknown, and an ISRC dropped where it is not
 * one.
 *
 * @param track - The song as the service gave it.
 * @returns The song to look for and to add as missing, or nothing where it has no title.
 */
const songOf = (track: ImportedTrack): (MissingSong & { isrc: string | null }) | null => {
  const title = track.title.trim();
  const artist = track.artist.trim();
  const album = track.album?.trim() ?? '';

  return title === ''
    ? null
    : {
        title: cutTo(title, MOST_CHARACTERS),
        artist: artist === '' ? 'Unknown artist' : cutTo(artist, MOST_CHARACTERS),
        album: album === '' ? null : cutTo(album, MOST_CHARACTERS),
        isrc: track.isrc !== null && track.isrc.length <= MOST_ISRC_CHARACTERS ? track.isrc : null,
      };
};

export { songOf };
