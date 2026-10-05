import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { LastfmError } from './LastfmError';
import type { LastfmKeys } from './LastfmKeys';
import { linkKeyFor } from './linkKeyFor';
import { readLastfmAs } from './readLastfmAs';
import { readLastfmSignIn } from './readLastfmSignIn';

const SessionSchema = z.object({ session: z.object({ name: z.string(), key: z.string() }) });

/** Last.fm's answer while somebody has not yet allowed the sign-in. */
const NOT_ALLOWED_YET = 14;

/**
 * Finishes connecting somebody's Last.fm once they have allowed Valence there, swapping the
 * sign-in token for a session that lasts until they revoke it.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param profileId - Who is connecting.
 * @param now - The time now.
 * @returns Nothing once connected, or a sentence saying why it is not yet.
 */
const finishLastfmSignIn = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  profileId: string,
  now: Date,
): Promise<string | null> => {
  const signIn = await readLastfmSignIn(valence, profileId, now);

  if (signIn === null) {
    return 'That sign-in ran out. Connect Last.fm again.';
  }

  try {
    const { session } = await readLastfmAs(
      valence,
      keys,
      { method: 'auth.getSession', params: { token: signIn.token }, isSigned: true },
      SessionSchema,
    );

    await valence.storage.set(linkKeyFor('lastfm', profileId), {
      sessionKey: session.key,
      user: session.name,
    });
    await valence.storage.delete(linkKeyFor('lastfm-sign-in', profileId));

    return null;
  } catch (failure) {
    if (failure instanceof LastfmError && failure.code === NOT_ALLOWED_YET) {
      return 'Last.fm has not been allowed yet. Allow Valence on Last.fm, then try again.';
    }

    if (failure instanceof LastfmError && failure.isSignedOut) {
      await valence.storage.delete(linkKeyFor('lastfm-sign-in', profileId));

      return 'That sign-in ran out. Connect Last.fm again.';
    }

    throw failure;
  }
};

export { finishLastfmSignIn };
