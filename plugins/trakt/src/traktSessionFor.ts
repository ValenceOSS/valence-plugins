import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { TraktSession } from './TraktSession';

/**
 * Somebody's way into Trakt: their token, which Valence refreshes, and the client id Trakt wants
 * on every call.
 *
 * @param valence - The host.
 * @param profileId - Whose account.
 * @returns The session, or nothing where they have not connected Trakt or it is not set up.
 */
const traktSessionFor = async (
  valence: ValenceHost,
  profileId: string,
): Promise<TraktSession | null> => {
  const clientId = (await valence.settings.read())['traktClientId'];
  const connection = await valence.accounts.connection(profileId, 'trakt');

  return connection === null || typeof clientId !== 'string' || clientId === ''
    ? null
    : { token: connection.accessToken, clientId };
};

export { traktSessionFor };
