import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import { accountKeyFor } from './accountKeyFor';
import { askTrakt } from './askTrakt';
import { traktSessionFor } from './traktSessionFor';

const SettingsSchema = z.object({ user: z.object({ username: z.string() }) });

/**
 * Asks Trakt who somebody connected as and keeps the username for the page, since Valence keeps
 * only the token.
 *
 * @param valence - The host.
 * @param profileId - Whose account.
 * @returns The username, or nothing where Trakt is not connected.
 */
const rememberAccount = async (valence: ValenceHost, profileId: string): Promise<string | null> => {
  const session = await traktSessionFor(valence, profileId);

  if (session === null) {
    return null;
  }

  const { username } = readJsonAs(
    await askTrakt(valence, session, '/users/settings'),
    SettingsSchema,
    'Trakt',
  ).user;

  await valence.storage.set(accountKeyFor(profileId), username);

  return username;
};

export { rememberAccount };
