import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { LastfmKeys } from './LastfmKeys';

/**
 * The Last.fm API key and shared secret from the plugin's settings.
 *
 * @param valence - The host.
 * @returns Them, or nothing where an administrator has not added both.
 */
const readLastfmKeys = async (valence: ValenceHost): Promise<LastfmKeys | null> => {
  const settings = await valence.settings.read();
  const apiKey = settings['lastfmApiKey'];
  const secret = settings['lastfmSharedSecret'];

  return typeof apiKey === 'string' && typeof secret === 'string' && apiKey !== '' && secret !== ''
    ? { apiKey, secret }
    : null;
};

export { readLastfmKeys };
