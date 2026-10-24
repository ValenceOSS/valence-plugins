import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

/** The storage every person's keys begin with, followed by their profile. */
const PER_PERSON = [
  'lastfm-sign-in',
  'told',
  'kept',
  'update',
  'requestMissing',
  'pending',
  'preferences',
  'listenbrainz',
  'lastfm',
] as const;

/**
 * Lets go of everything kept for someone whose profile is gone: their connections, waiting
 * scrobbles, choices, kept playlists and albums still to be requested. Valence forgets their sealed
 * tokens itself. The keys a later run finds a removed profile by go last, so a clean-up cut short is
 * finished next time.
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
