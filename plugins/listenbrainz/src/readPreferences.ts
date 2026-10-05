import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Preferences } from './Preferences';
import { PreferencesSchema } from './Preferences';

/**
 * What somebody chose, or the defaults: scrobbling on and no playlists kept.
 *
 * @param valence - The host.
 * @param profileId - Whose choices.
 * @returns The choices.
 */
const readPreferences = async (valence: ValenceHost, profileId: string): Promise<Preferences> => {
  const read = PreferencesSchema.safeParse(await valence.storage.get(`preferences:${profileId}`));

  return read.success ? read.data : { scrobble: true, keep: [] };
};

export { readPreferences };
