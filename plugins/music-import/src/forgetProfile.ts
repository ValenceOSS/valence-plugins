import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { PENDING_REQUESTS } from '@Shared/PENDING_REQUESTS';
import { jobKeyFor } from './jobKeyFor';

/**
 * Lets go of everything kept for someone whose profile is gone: their import and the playlists
 * whose albums were still to be requested.
 *
 * @param valence - The host.
 * @param profileId - The profile that was removed.
 */
const forgetProfile = async (valence: ValenceHost, profileId: string): Promise<void> => {
  await valence.storage.delete(jobKeyFor(profileId));

  for (const key of await valence.storage.keys(`${PENDING_REQUESTS}${profileId}:`)) {
    await valence.storage.delete(key);
  }
};

export { forgetProfile };
