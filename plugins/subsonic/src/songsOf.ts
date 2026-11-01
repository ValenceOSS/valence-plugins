import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { songOf } from './songOf';

const AT_ONCE = 200;

/**
 * The songs of some tracks as a Subsonic app expects them, read as one person, leaving out any the
 * person may not see.
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
    const read = await valence.library.details(ids.slice(at, at + AT_ONCE), { profileId });

    songs.push(...read.filter((each) => each.kind === 'track').map(songOf));
  }

  return songs;
};

export { songsOf };
