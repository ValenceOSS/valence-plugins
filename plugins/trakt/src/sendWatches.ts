import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { jsonOf } from '@Shared/jsonOf';
import { askTrakt } from './askTrakt';
import { historyBodyFor } from './historyBodyFor';
import type { PendingPush } from './PendingPush';
import type { TraktSession } from './TraktSession';

const AnswerSchema = z.object({
  added: z.object({ movies: z.number().optional(), episodes: z.number().optional() }).optional(),
});

const NOT_TAKEN = new Set([429, 502, 503, 504, 521, 522, 525, 526]);

const PUT_RIGHT_LATER = new Set([401, 403, 410, 423]);

const CUT_OFF = /took too long|ECONNRESET|socket hang up/u;

type Outcome = 'sent' | 'notFound' | 'nothingToSend' | 'wait' | 'uncertain' | 'refused';

/**
 * Adds finished films and episodes to somebody's Trakt history in one call, each at the time it was
 * finished, since Trakt takes one post a second from a person. What the call came to decides what
 * becomes of them. Trakt not reached, busy or overloaded, or a sign-in, client id or account that
 * can be put right, means wait and send again. A call cut off part way, or a server error, leaves it
 * unclear whether Trakt kept them, so they aren't sent again, since Trakt keeps every play it is
 * sent and a second send would count twice. Trakt taking the call but finding none of them is told
 * apart from adding them.
 *
 * @param valence - The host.
 * @param session - Their Trakt session.
 * @param pushes - What was finished, and when.
 * @returns What became of them, together.
 */
const sendWatches = async (
  valence: ValenceHost,
  session: TraktSession,
  pushes: readonly PendingPush[],
): Promise<Outcome> => {
  const movies: object[] = [];
  const shows: object[] = [];

  for (const push of pushes) {
    const media = await valence.library.get(push.mediaId);
    const body =
      media === null || (media.kind !== 'film' && media.kind !== 'episode')
        ? null
        : await historyBodyFor(valence, media, push.watchedAt);

    if (body !== null && 'movies' in body && Array.isArray(body.movies)) {
      movies.push(...body.movies);
    } else if (body !== null && 'shows' in body && Array.isArray(body.shows)) {
      shows.push(...body.shows);
    }
  }

  if (movies.length === 0 && shows.length === 0) {
    return 'nothingToSend';
  }

  const answer = await askTrakt(valence, session, '/sync/history', {
    ...(movies.length === 0 ? {} : { movies }),
    ...(shows.length === 0 ? {} : { shows }),
  }).catch((failure: unknown) => (failure instanceof Error ? failure.message : 'unknown'));

  if (typeof answer === 'string') {
    return CUT_OFF.test(answer) ? 'uncertain' : 'wait';
  }

  if (NOT_TAKEN.has(answer.status) || PUT_RIGHT_LATER.has(answer.status)) {
    return 'wait';
  }

  if (answer.status >= 500) {
    return 'uncertain';
  }

  if (answer.status < 200 || answer.status >= 300) {
    return 'refused';
  }

  const said = jsonOf(answer.text, AnswerSchema);
  const added = (said?.added?.movies ?? 0) + (said?.added?.episodes ?? 0);

  return said !== null && added === 0 ? 'notFound' : 'sent';
};

export type { Outcome };

export { sendWatches };
