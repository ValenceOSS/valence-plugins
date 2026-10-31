import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { albumOf } from './albumOf';

/**
 * Albums as a Subsonic app expects them, each with its song count and running time, read as one
 * person.
 *
 * @param valence - The host.
 * @param profileId - Who is reading.
 * @param albums - The albums, in the order to give them.
 * @returns The albums.
 */
const albumsOf = async (
  valence: ValenceHost,
  profileId: string,
  albums: readonly MediaRef[],
): Promise<SubsonicBody[]> => {
  if (albums.length === 0) {
    return [];
  }

  const details = await valence.library.details(
    albums.map((album) => album.id),
    { profileId },
  );
  const answered: SubsonicBody[] = [];

  for (const album of details) {
    answered.push(albumOf(album, await valence.library.children(album.id, { profileId })));
  }

  return answered;
};

export { albumsOf };
