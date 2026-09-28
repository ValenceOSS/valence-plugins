import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { base64 } from '@Shared/base64';
import { formBody } from '@Shared/formBody';
import { readJsonAs } from '@Shared/readJsonAs';

const TokenSchema = z.object({ access_token: z.string() });

/**
 * A token to read Spotify with: the viewer's own where they connected Spotify, which reaches their
 * private playlists, and otherwise the plugin's own client token, which reaches public ones.
 *
 * @param valence - The host.
 * @param profileId - Who is importing.
 * @returns The token, or nothing where Spotify is neither connected nor set up.
 */
const spotifyToken = async (valence: ValenceHost, profileId: string): Promise<string | null> => {
  const connection = await valence.accounts.connection(profileId, 'spotify');

  if (connection !== null) {
    return connection.accessToken;
  }

  const settings = await valence.settings.read();
  const id = settings['spotifyClientId'];
  const secret = settings['spotifyClientSecret'];

  if (typeof id !== 'string' || typeof secret !== 'string' || id === '' || secret === '') {
    return null;
  }

  const answer = await valence.http.fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${base64(`${id}:${secret}`)}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formBody({ grant_type: 'client_credentials' }),
  });

  return readJsonAs(answer, TokenSchema, 'Spotify').access_token;
};

export { spotifyToken };
