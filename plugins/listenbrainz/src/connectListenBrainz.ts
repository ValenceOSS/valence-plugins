import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import { askListenBrainz } from './askListenBrainz';
import { linkKeyFor } from './linkKeyFor';

const ValidationSchema = z.object({ valid: z.boolean(), user_name: z.string().optional() });

/**
 * Connects somebody's ListenBrainz with the user token they pasted, once ListenBrainz confirms
 * whose it is.
 *
 * @param valence - The host.
 * @param profileId - Who is connecting.
 * @param token - What they pasted.
 * @returns Nothing once connected, or a sentence saying why it could not be.
 */
const connectListenBrainz = async (
  valence: ValenceHost,
  profileId: string,
  token: string,
): Promise<string | null> => {
  const pasted = token.trim();

  if (!/^[0-9a-f-]{20,64}$/iu.test(pasted)) {
    return 'That is not a ListenBrainz user token. It is on your ListenBrainz settings page.';
  }

  const answer = readJsonAs(
    await askListenBrainz(valence, '/1/validate-token', { token: pasted }),
    ValidationSchema,
    'ListenBrainz',
  );

  if (!answer.valid || answer.user_name === undefined) {
    return 'ListenBrainz did not accept that token. Copy it again from your ListenBrainz settings page.';
  }

  await valence.storage.set(linkKeyFor('listenbrainz', profileId), {
    token: pasted,
    user: answer.user_name,
  });

  return null;
};

export { connectListenBrainz };
