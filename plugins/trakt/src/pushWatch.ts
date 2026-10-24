import { z } from 'zod';
import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { pushKeyFor } from './pushKeyFor';
import { readPreferences } from './readPreferences';
import { RECENT_KEY } from './RECENT_KEY';
import { sendWatches } from './sendWatches';
import { traktSessionFor } from './traktSessionFor';

/** How long after sending a finish the same thing finishing again counts as the same viewing,
 * where its length isn't known. */
const SAME_VIEWING_MS = 3 * 3_600_000;

/** How many recent finishes are remembered for that. */
const MOST_REMEMBERED = 50;

const RecentSchema = z.array(z.object({ mediaId: z.string(), at: z.number() }));

/**
 * When somebody finishes a film or an episode, adds it to their Trakt history at the time they
 * finished, if they have Trakt connected and have not turned this off. Finishing the same thing
 * again within its own length, such as stopping in the credits and then once more at the end,
 * counts as the same viewing and isn't sent twice, since Trakt keeps every play it is sent. A
 * finish Trakt can't take just then, or that finds Valence unable to renew the connection just
 * then, waits for the hourly run. Each is logged with what became of it, so an operator can tell
 * where a watch went. Songs and books are none of Trakt's business, and pass without a word.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns Whether Trakt was told.
 */
const pushWatch = async (valence: ValenceHost, event: PluginEvent): Promise<boolean> => {
  if (event.topic !== 'playback.finished' || event.profileId === null || event.mediaId === null) {
    return false;
  }

  const media = await valence.library.get(event.mediaId);

  if (media !== null && media.kind !== 'film' && media.kind !== 'episode') {
    return false;
  }

  const session = await traktSessionFor(valence, event.profileId).catch((failure: unknown) => {
    valence.log.warn('Could not renew the Trakt connection just now', {
      profile: event.profileId,
      problem: failure instanceof Error ? failure.message : 'unknown',
    });

    return 'notNow' as const;
  });

  if (session === null) {
    return false;
  }

  const about = { profile: event.profileId, media: event.mediaId };

  if (!(await readPreferences(valence, event.profileId)).twoWay) {
    valence.log.info('Did not send a finish to Trakt: sending is turned off', about);

    return false;
  }

  const recentKey = `${RECENT_KEY}${event.profileId}`;
  const read = RecentSchema.safeParse(await valence.storage.get(recentKey));
  const recent = read.success ? read.data : [];
  const at = Date.parse(event.occurredAt);
  const window =
    event.durationSeconds !== null && event.durationSeconds > 0
      ? event.durationSeconds * 1000
      : SAME_VIEWING_MS;

  if (recent.some((each) => each.mediaId === event.mediaId && at - each.at < window)) {
    valence.log.info('Did not send a finish to Trakt: it was sent a moment ago', about);

    return false;
  }

  const push = { mediaId: event.mediaId, watchedAt: event.occurredAt };
  const outcome = session === 'notNow' ? 'wait' : await sendWatches(valence, session, [push]);

  if (outcome === 'nothingToSend') {
    valence.log.info('Did not send a finish to Trakt: not a film or a numbered episode', about);

    return false;
  }

  await valence.storage.set(
    recentKey,
    [...recent, { mediaId: event.mediaId, at }].slice(-MOST_REMEMBERED),
  );

  if (outcome === 'wait') {
    await valence.storage.set(pushKeyFor(event.profileId, push), push);
  }

  valence.log[outcome === 'refused' || outcome === 'uncertain' ? 'warn' : 'info'](
    {
      sent: 'Added a finished watch to Trakt',
      notFound: 'Trakt could not find a finished watch',
      wait: 'Trakt could not take a finish just now; it will be sent again',
      uncertain: 'Did not send a finish to Trakt again: it may already have reached Trakt',
      refused: 'Trakt refused a finished watch',
    }[outcome],
    about,
  );

  return outcome === 'sent';
};

export { pushWatch };
