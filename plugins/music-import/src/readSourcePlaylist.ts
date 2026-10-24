import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { PlaylistLink } from './readPlaylistLink';
import { readApplePlaylist } from './readApplePlaylist';
import { readSpotifyPlaylist } from './readSpotifyPlaylist';
import type { SourcePlaylist } from './SourcePlaylist';

/**
 * Reads the playlist a link or a connected account points at, from whichever service it is on.
 * Spotify is read with the person's own account, since Spotify shares songs only from playlists
 * they made or collaborate on.
 *
 * @param valence - The host.
 * @param profileId - Who is importing.
 * @param link - Which playlist.
 * @returns The playlist, or a sentence saying why it could not be read.
 */
const readSourcePlaylist = async (
  valence: ValenceHost,
  profileId: string,
  link: PlaylistLink,
): Promise<SourcePlaylist | string> => {
  if (link.source === 'spotify') {
    const connection = await valence.accounts.connection(profileId, 'spotify');

    return connection === null
      ? 'Connect Spotify first. It shares the songs of playlists you made or collaborate on.'
      : readSpotifyPlaylist(valence, connection.accessToken, link.id);
  }

  const developerToken = (await valence.settings.read())['appleMusicToken'];

  return typeof developerToken !== 'string' || developerToken === ''
    ? 'An administrator needs to add an Apple Music developer token in this plugin’s settings.'
    : readApplePlaylist(valence, developerToken, link.storefront, link.id);
};

export { readSourcePlaylist };
