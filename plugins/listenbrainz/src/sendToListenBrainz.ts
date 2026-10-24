import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { jsonOf } from '@Shared/jsonOf';
import { askListenBrainz } from './askListenBrainz';
import type { Listen } from './Listen';
import type { ListenBrainzLink } from './Links';
import type { SendOutcome } from './SendOutcome';

const ErrorSchema = z.object({ error: z.string() });

const ValidationSchema = z.object({ valid: z.boolean() });

/**
 * Whether ListenBrainz still takes somebody's token, to tell a refused listen from a revoked token.
 *
 * @param valence - The host.
 * @param token - Their user token.
 * @returns Whether it is valid, taking it to be where ListenBrainz cannot be asked.
 */
const isTokenValid = async (valence: ValenceHost, token: string): Promise<boolean> => {
  try {
    const read = jsonOf(
      (await askListenBrainz(valence, '/1/validate-token', { token })).text,
      ValidationSchema,
    );

    return read === null || read.valid;
  } catch {
    return true;
  }
};

/**
 * Sends listens to somebody's ListenBrainz, as finished, several at once, or one as playing now.
 * A 401 is also how ListenBrainz refuses an account it takes no listens from, such as one without a
 * verified email address, so the token is asked about before the person is taken to be signed out.
 *
 * @param valence - The host.
 * @param link - Their ListenBrainz connection.
 * @param listens - The songs, oldest first.
 * @param isPlayingNow - Whether the one song has only started.
 * @returns How it went, for all of them together.
 */
const sendToListenBrainz = async (
  valence: ValenceHost,
  link: ListenBrainzLink,
  listens: readonly Listen[],
  isPlayingNow: boolean,
): Promise<SendOutcome> => {
  const payload = listens.map((listen) => {
    const metadata = {
      artist_name: listen.artist,
      track_name: listen.title,
      ...(listen.album === null ? {} : { release_name: listen.album }),
      additional_info: {
        media_player: 'Valence',
        submission_client: 'Valence',
        submission_client_version: valence.plugin.version,
        ...(listen.durationSeconds === null || listen.durationSeconds <= 0
          ? {}
          : { duration_ms: listen.durationSeconds * 1000 }),
      },
    };

    return isPlayingNow
      ? { track_metadata: metadata }
      : { listened_at: listen.startedAt, track_metadata: metadata };
  });
  let answer: { status: number; text: string };

  try {
    answer = await askListenBrainz(valence, '/1/submit-listens', {
      token: link.token,
      body: {
        listen_type: isPlayingNow ? 'playing_now' : payload.length === 1 ? 'single' : 'import',
        payload,
      },
    });
  } catch {
    return { kind: 'busy' };
  }

  if (answer.status >= 200 && answer.status < 300) {
    return { kind: 'sent' };
  }

  if (answer.status === 429 || answer.status >= 500) {
    return { kind: 'busy' };
  }

  const said =
    jsonOf(answer.text, ErrorSchema)?.error ?? `ListenBrainz answered ${answer.status.toString()}`;

  if (answer.status === 401) {
    return (await isTokenValid(valence, link.token))
      ? { kind: 'refused', reason: said, isTheirs: true }
      : { kind: 'signedOut' };
  }

  return { kind: 'refused', reason: said, isTheirs: false };
};

export { sendToListenBrainz };
