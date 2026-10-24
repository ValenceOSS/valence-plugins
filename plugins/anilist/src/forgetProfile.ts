import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { jobKeyFor } from './jobKeyFor';
import { linkKeyFor } from './linkKeyFor';
import { preferencesKeyFor } from './preferencesKeyFor';

/**
 * Lets go of everything kept for someone whose profile is gone: their import, their choices and
 * what their import matched.
 *
 * @param valence - The host.
 * @param profileId - The profile that was removed.
 */
const forgetProfile = async (valence: ValenceHost, profileId: string): Promise<void> => {
  await valence.storage.delete(jobKeyFor(profileId));
  await valence.storage.delete(preferencesKeyFor(profileId));

  for (const key of await valence.storage.keys(linkKeyFor(profileId, ''))) {
    await valence.storage.delete(key);
  }
};

export { forgetProfile };
