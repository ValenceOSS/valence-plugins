import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Preferences } from './Preferences';
import { PreferencesSchema } from './Preferences';

/**
 * What somebody chose for their lists, or the default of passing progress back as they watch.
 *
 * @param valence - The host.
 * @param profileId - Whose choices.
 * @returns The choices.
 */
const readPreferences = async (valence: ValenceHost, profileId: string): Promise<Preferences> => {
  const read = PreferencesSchema.safeParse(await valence.storage.get(`preferences:${profileId}`));

  return read.success ? read.data : { twoWay: true };
};

export { readPreferences };
