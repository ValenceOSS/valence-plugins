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
 * @returns The playlist.
 */
const playlistOf = async (
  valence: ValenceHost,
  person: { profileId: string; name: string; login: string },
  playlist: PlaylistContents,
): Promise<SubsonicBody> => {
  const songs = await songsOf(
    valence,
    person.profileId,
    playlist.entries.flatMap((entry) => (entry.mediaId === null ? [] : [entry.mediaId])),
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
    entry: songs,
  };
};

export { playlistOf };
