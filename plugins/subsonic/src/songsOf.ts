import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { songOf } from './songOf';

const AT_ONCE = 200;

/**
 * The songs of some tracks as a Subsonic app expects them, read as one person, in the order given
 * and as often as given, so a playlist holding a song twice shows it twice. Tracks the person may
 * not see, and anything that isn't a song, are left out. Each song says whether they liked it, the
 * stars they gave it, and how often and when they last played it, unless only the songs' lengths
 * are wanted.
 *
 * @param valence - The host.
 * @param profileId - Who is reading.
 * @param ids - The tracks, in the order to give them.
 * @param withState - Whether to read the person's likes, stars and plays too.
 * @returns The songs.
 */
const songsOf = async (
  valence: ValenceHost,
  profileId: string,
  ids: readonly string[],
  withState = true,
): Promise<SubsonicBody[]> => {
  const songs: SubsonicBody[] = [];

  for (let at = 0; at < ids.length; at += AT_ONCE) {
    const these = ids.slice(at, at + AT_ONCE);
    const [read, states] = await Promise.all([
      valence.library.details(these, { profileId }),
      withState ? valence.viewing.state(profileId, these) : Promise.resolve([]),
    ]);
    const trackOf = new Map(
      read.filter((each) => each.kind === 'track').map((track) => [track.id, track]),
    );
    const stateOf = new Map(states.map((state) => [state.mediaId, state]));

    for (const id of these) {
      const track = trackOf.get(id);

      if (track !== undefined) {
        songs.push(songOf(track, withState ? (stateOf.get(id) ?? null) : null));
      }
    }
  }

  return songs;
};

export { songsOf };
