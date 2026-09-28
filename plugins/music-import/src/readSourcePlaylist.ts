import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { PlaylistLink } from './readPlaylistLink';
import { readApplePlaylist } from './readApplePlaylist';
import { readSpotifyPlaylist } from './readSpotifyPlaylist';
import type { SourcePlaylist } from './SourcePlaylist';
import { spotifyToken } from './spotifyToken';

/**
 * Reads the playlist a link or a connected account points at, from whichever service it is on.
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
    const token = await spotifyToken(valence, profileId);

    return token === null
      ? 'Connect Spotify first, or ask an administrator to add Spotify’s client id and secret.'
      : readSpotifyPlaylist(valence, token, link.id);
  }

  const developerToken = (await valence.settings.read())['appleMusicToken'];

  return typeof developerToken !== 'string' || developerToken === ''
    ? 'An administrator needs to add an Apple Music developer token in this plugin’s settings.'
    : readApplePlaylist(valence, developerToken, link.storefront, link.id);
};

export { readSourcePlaylist };
