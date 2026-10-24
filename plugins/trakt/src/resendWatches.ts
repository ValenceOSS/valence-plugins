import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { PendingPushSchema } from './PendingPush';
import { pushKeyFor } from './pushKeyFor';
import { sendWatches } from './sendWatches';
import type { TraktSession } from './TraktSession';

/** The most finishes sent again in one call. */
const AT_ONCE = 20;

/** How old a waiting finish may get before it is let go. */
const MOST_AGE_MS = 14 * 24 * 3_600_000;

/**
 * Sends again, in one call, the finishes Trakt couldn't take when they happened, since Trakt takes
 * one post a second from a person. They are let go once Trakt has them, or doesn't find them, or
 * refuses them, or once it is unclear whether it kept them; they wait for the next run while Trakt
 * is busy or the person's account is locked, but not beyond two weeks.
 *
 * @param valence - The host.
 * @param profileId - Whose.
 * @param session - Their Trakt session.
 * @param now - The time now.
 * @returns How many are still waiting.
 */
const resendWatches = async (
  valence: ValenceHost,
  profileId: string,
  session: TraktSession,
  now: Date,
): Promise<number> => {
  const keys = (await valence.storage.keys(pushKeyFor(profileId))).sort();
  const sending: { key: string; push: { mediaId: string; watchedAt: string } }[] = [];

  for (const key of keys) {
    const read = PendingPushSchema.safeParse(await valence.storage.get(key));

    if (!read.success || now.getTime() - Date.parse(read.data.watchedAt) > MOST_AGE_MS) {
      await valence.storage.delete(key);
    } else if (sending.length < AT_ONCE) {
      sending.push({ key, push: read.data });
    }
  }

  if (sending.length === 0) {
    return 0;
  }

  const outcome = await sendWatches(
    valence,
    session,
    sending.map((each) => each.push),
  );

  if (outcome === 'wait') {
    return (await valence.storage.keys(pushKeyFor(profileId))).length;
  }

  for (const { key } of sending) {
    await valence.storage.delete(key);
  }

  if (outcome !== 'sent') {
    valence.log.warn('Let go of finishes Trakt did not take', {
      profile: profileId,
      count: sending.length,
      outcome,
    });
  }

  return (await valence.storage.keys(pushKeyFor(profileId))).length;
};

export { resendWatches };
