import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { LastfmError } from './LastfmError';
import type { LastfmKeys } from './LastfmKeys';
import type { Listen } from './Listen';
import type { LastfmLink } from './Links';
import { readLastfmAs } from './readLastfmAs';
import type { SendOutcome } from './SendOutcome';

/** Last.fm scrobbles nothing of 30 seconds or less. */
const SHORTEST_SECONDS = 30;

/** Last.fm's code for a scrobble held back by its daily limit, which can be sent again tomorrow. */
const DAILY_LIMIT = 5;

const IgnoredSchema = z.object({
  ignoredMessage: z.object({ code: z.coerce.number(), '#text': z.string().optional() }).optional(),
});

const ScrobblesSchema = z.object({
  scrobbles: z
    .object({ scrobble: z.union([IgnoredSchema, z.array(IgnoredSchema)]).optional() })
    .optional(),
});

/**
 * Sends listens to somebody's Last.fm, up to fifty scrobbles at once, or one song as playing now.
 * Last.fm can take a call yet ignore some of its scrobbles, saying why for each, so each listen
 * gets its own outcome: one over the daily limit waits, and one it ignores for good is refused.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param link - Their Last.fm connection.
 * @param listens - The songs, oldest first.
 * @param isPlayingNow - Whether the one song has only started.
 * @returns How it went for each listen, in order.
 */
const sendToLastfm = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  link: LastfmLink,
  listens: readonly Listen[],
  isPlayingNow: boolean,
): Promise<SendOutcome[]> => {
  const isTooShort = (listen: Listen) =>
    !isPlayingNow && listen.durationSeconds !== null && listen.durationSeconds <= SHORTEST_SECONDS;
  const sending = listens.filter((listen) => !isTooShort(listen));
  const params = isPlayingNow
    ? Object.fromEntries(
        sending.flatMap((listen) => [
          ['artist', listen.artist],
          ['track', listen.title],
          ...(listen.album === null ? [] : [['album', listen.album]]),
          ...(listen.durationSeconds === null
            ? []
            : [['duration', listen.durationSeconds.toString()]]),
        ]),
      )
    : Object.fromEntries(
        sending.flatMap((listen, at) => {
          const field = (name: string) => `${name}[${at.toString()}]`;

          return [
            [field('artist'), listen.artist],
            [field('track'), listen.title],
            [field('timestamp'), listen.startedAt.toString()],
            ...(listen.album === null ? [] : [[field('album'), listen.album]]),
            ...(listen.durationSeconds === null
              ? []
              : [[field('duration'), listen.durationSeconds.toString()]]),
          ];
        }),
      );
  let answered: SendOutcome[];

  try {
    const read =
      sending.length === 0
        ? null
        : await readLastfmAs(
            valence,
            keys,
            {
              method: isPlayingNow ? 'track.updateNowPlaying' : 'track.scrobble',
              params: { ...params, sk: link.sessionKey },
              isSigned: true,
            },
            ScrobblesSchema,
          );
    const each = read?.scrobbles?.scrobble;
    const said = Array.isArray(each) ? each : each === undefined ? [] : [each];

    answered = sending.map((_, at): SendOutcome => {
      const ignored = said[at]?.ignoredMessage;

      if (isPlayingNow || ignored === undefined || ignored.code === 0) {
        return { kind: 'sent' };
      }

      return ignored.code === DAILY_LIMIT
        ? { kind: 'busy' }
        : {
            kind: 'refused',
            reason:
              ignored['#text'] === undefined || ignored['#text'] === ''
                ? `Last.fm ignored it (${ignored.code.toString()})`
                : ignored['#text'],
            isTheirs: false,
          };
    });
  } catch (failure) {
    if (!(failure instanceof LastfmError)) {
      throw failure;
    }

    const outcome: SendOutcome = failure.isSignedOut
      ? { kind: 'signedOut' }
      : failure.isMisconfigured
        ? { kind: 'misconfigured', reason: failure.message }
        : failure.isBusy
          ? { kind: 'busy' }
          : { kind: 'refused', reason: failure.message, isTheirs: false };

    answered = sending.map(() => outcome);
  }

  let next = 0;

  return listens.map((listen): SendOutcome => {
    if (isTooShort(listen)) {
      return {
        kind: 'refused',
        reason: 'Last.fm takes no song of 30 seconds or less',
        isTheirs: false,
      };
    }

    next += 1;

    return answered[next - 1] ?? { kind: 'busy' };
  });
};

export { sendToLastfm };
