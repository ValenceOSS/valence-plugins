import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { formBody } from '@Shared/formBody';
import { LastfmError } from './LastfmError';
import type { LastfmKeys } from './LastfmKeys';
import { lastfmSignatureOf } from './lastfmSignatureOf';

const API = 'https://ws.audioscrobbler.com/2.0/';

const RefusalSchema = z.object({ error: z.number(), message: z.string().optional() });

/**
 * Reads Last.fm's answer as JSON, without trusting it to be any.
 *
 * @param text - The answer's body.
 * @returns It parsed, or nothing where it is not JSON.
 */
const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Calls Last.fm's API: a signed post for anything that changes somebody's account or signs them
 * in, and a plain read otherwise. Last.fm reports a refusal in the body, often with a 200, so the
 * body is checked whatever the status.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param method - The method, such as `track.scrobble`.
 * @param params - Its parameters.
 * @param isSigned - Whether the call is signed and posted.
 * @returns The answer, parsed but not yet checked.
 */
const askLastfm = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  method: string,
  params: Record<string, string>,
  isSigned: boolean,
): Promise<unknown> => {
  const all = { ...params, method, api_key: keys.apiKey };
  const body = formBody({
    ...all,
    ...(isSigned ? { api_sig: lastfmSignatureOf(all, keys.secret) } : {}),
    format: 'json',
  });
  let answer: { status: number; text: string };

  try {
    answer = await valence.http.fetch(
      isSigned ? API : `${API}?${body}`,
      isSigned
        ? { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }
        : {},
    );
  } catch (failure) {
    throw new LastfmError(0, failure instanceof Error ? failure.message : 'Last.fm did not answer');
  }

  const read = parsed(answer.text);
  const refusal = RefusalSchema.safeParse(read);

  if (refusal.success) {
    throw new LastfmError(refusal.data.error, refusal.data.message ?? 'Last.fm refused it');
  }

  if (answer.status < 200 || answer.status >= 300 || read === null) {
    throw new LastfmError(0, `Last.fm answered ${answer.status.toString()}`);
  }

  return read;
};

export { askLastfm };
