import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { KeptPlaylist } from './KeptPlaylist';
import { KeptPlaylistSchema } from './KeptPlaylist';
import { playlistKeysFor } from './playlistKeysFor';

/**
 * The Valence playlist kept in step with one of somebody's service playlists.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @param sourceId - Which service playlist.
 * @returns It, or nothing where it has never been made.
 */
const readKeptPlaylist = async (
  valence: ValenceHost,
  profileId: string,
  sourceId: string,
): Promise<KeptPlaylist | null> => {
  const read = KeptPlaylistSchema.safeParse(
    await valence.storage.get(playlistKeysFor(profileId, sourceId).kept),
  );

  return read.success ? read.data : null;
};

export { readKeptPlaylist };
