import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

/** The storage every person's keys begin with, followed by their profile. */
const PER_PERSON = ['import', 'sync', 'preferences', 'account', 'recent', 'push'] as const;

/**
 * Lets go of everything kept for someone whose profile is gone: their history reads, choices,
 * account name, recent finishes and finishes waiting to be sent.
 *
 * @param valence - The host.
 * @param profileId - The profile that was removed.
 */
const forgetProfile = async (valence: ValenceHost, profileId: string): Promise<void> => {
  for (const prefix of PER_PERSON) {
    await valence.storage.delete(`${prefix}:${profileId}`);

    for (const key of await valence.storage.keys(`${prefix}:${profileId}:`)) {
      await valence.storage.delete(key);
    }
  }
};

export { forgetProfile };
