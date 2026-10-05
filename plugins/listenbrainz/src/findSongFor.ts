import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SourceTrack } from './SourceTrack';

/**
 * Finds a service's song in the library: by its title and its whole artist credit, then by each
 * artist it credits, since a library credits "A & B" as two artists.
 *
 * @param valence - The host.
 * @param track - The song.
 * @returns The library's id for it, or nothing where the library does not have it.
 */
const findSongFor = async (valence: ValenceHost, track: SourceTrack): Promise<string | null> => {
  for (const artist of track.artists) {
    const found = await valence.music.findTrack({
      title: track.title,
      artist,
      ...(track.album === null ? {} : { album: track.album }),
    });

    if (found !== null) {
      return found.id;
    }
  }

  return null;
};

export { findSongFor };
