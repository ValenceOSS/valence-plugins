import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { LastfmSignIn } from './Links';
import { LastfmSignInSchema } from './Links';
import { linkKeyFor } from './linkKeyFor';

/** How long Last.fm keeps a sign-in token. */
const SIGN_IN_MINUTES = 60;

/**
 * Somebody's Last.fm sign-in under way, while Last.fm still honours its token.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @param now - The time now.
 * @returns The sign-in, or nothing where none was started or it has run out.
 */
const readLastfmSignIn = async (
  valence: ValenceHost,
  profileId: string,
  now: Date,
): Promise<LastfmSignIn | null> => {
  const read = LastfmSignInSchema.safeParse(
    await valence.storage.get(linkKeyFor('lastfm-sign-in', profileId)),
  );

  return read.success && now.getTime() - Date.parse(read.data.startedAt) < SIGN_IN_MINUTES * 60_000
    ? read.data
    : null;
};

export { readLastfmSignIn };
