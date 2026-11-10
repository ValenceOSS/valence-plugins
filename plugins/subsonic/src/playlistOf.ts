import type { PlaylistContents, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { songsOf } from './songsOf';
import { EPOCH } from './EPOCH';

/**
 * A playlist as a Subsonic app expects it, with the songs in it the person may play, in order;
 * the songs it lists that Valence doesn't have are left out.
 *
 * @param valence - The host.
 * @param person - Whose playlist it is.
 * @param playlist - What it holds.
 * @param withSongs - Whether to give the songs too, or only how many there are and how long.
 * @returns The playlist.
 */
const playlistOf = async (
  valence: ValenceHost,
  person: { profileId: string; name: string; login: string },
  playlist: PlaylistContents,
  withSongs = true,
): Promise<SubsonicBody> => {
  const songs = await songsOf(
    valence,
    person.profileId,
    playlist.entries.flatMap((entry) => (entry.mediaId === null ? [] : [entry.mediaId])),
    withSongs,
  );

  return {
    id: playlist.id,
    name: playlist.name,
    owner: person.login,
    public: false,
    songCount: songs.length,
    duration: songs.reduce(
      (all, song) => all + (typeof song['duration'] === 'number' ? song['duration'] : 0),
      0,
    ),
    created: EPOCH,
    changed: EPOCH,
    ...(withSongs ? { entry: songs } : {}),
  };
};

export { playlistOf };
