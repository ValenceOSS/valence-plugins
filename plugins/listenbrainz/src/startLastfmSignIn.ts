import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { LastfmKeys } from './LastfmKeys';
import type { LastfmSignIn } from './Links';
import { linkKeyFor } from './linkKeyFor';
import { readLastfmAs } from './readLastfmAs';

const TokenSchema = z.object({ token: z.string().min(1) });

/**
 * Starts connecting somebody's Last.fm: asks Last.fm for a sign-in token, which they then allow
 * on Last.fm's own site. Last.fm's way for an app with no address of its own to return to.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param profileId - Who is connecting.
 * @param now - The time now.
 * @returns The sign-in under way.
 */
const startLastfmSignIn = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  profileId: string,
  now: Date,
): Promise<LastfmSignIn> => {
  const { token } = await readLastfmAs(
    valence,
    keys,
    { method: 'auth.getToken', params: {}, isSigned: true },
    TokenSchema,
  );
  const signIn = { token, startedAt: now.toISOString() };

  await valence.storage.set(linkKeyFor('lastfm-sign-in', profileId), signIn);

  return signIn;
};

export { startLastfmSignIn };
