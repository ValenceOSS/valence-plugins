import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { songOf } from './songOf';

const AT_ONCE = 200;

/**
 * The songs of some tracks as a Subsonic app expects them, read as one person, leaving out any the
 * person may not see, each with whether they liked it, the stars they gave it, and how often and when they last played it.
 *
 * @param valence - The host.
 * @param profileId - Who is reading.
 * @param ids - The tracks, in the order to give them.
 * @returns The songs.
 */
const songsOf = async (
  valence: ValenceHost,
  profileId: string,
  ids: readonly string[],
): Promise<SubsonicBody[]> => {
  const songs: SubsonicBody[] = [];

  for (let at = 0; at < ids.length; at += AT_ONCE) {
    const these = ids.slice(at, at + AT_ONCE);
    const [read, states] = await Promise.all([
      valence.library.details(these, { profileId }),
      valence.viewing.state(profileId, these),
    ]);
    const stateOf = new Map(states.map((state) => [state.mediaId, state]));

    songs.push(
      ...read
        .filter((each) => each.kind === 'track')
        .map((track) => songOf(track, stateOf.get(track.id) ?? null)),
    );
  }

  return songs;
};

export { songsOf };
