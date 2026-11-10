import { z } from 'zod';
import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { songsOf } from './songsOf';

const MOST_QUEUED = 2000;

const QueueSchema = z.object({
  ids: z.array(z.string()).max(MOST_QUEUED),
  current: z.string().nullable(),
  positionMs: z.number().int().nonnegative(),
  changed: z.string(),
  changedBy: z.string(),
});

/**
 * The play queue an app keeps on the server, so another app, or the same one on another device,
 * carries on where the person left off. It is kept for each person apart, and only for Subsonic
 * apps: Valence's own players keep theirs on the device.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @param endpoint - Whether the app is saving the queue or reading it.
 * @returns The answer.
 */
const answerPlayQueue = async (
  { valence, person, asked, receivedAt, ok }: Answering,
  endpoint: 'getPlayQueue' | 'savePlayQueue',
): Promise<SubsonicReply> => {
  const key = `queue:${person.profileId}`;

  if (endpoint === 'savePlayQueue') {
    const ids = asked.texts('id').slice(0, MOST_QUEUED);

    if (ids.length === 0) {
      await valence.storage.delete(key);

      return ok();
    }

    await valence.storage.set(key, {
      ids,
      current: asked.text('current'),
      positionMs: asked.number('position', 0, Number.MAX_SAFE_INTEGER),
      changed: receivedAt,
      changedBy: (asked.text('c') ?? '').slice(0, 100),
    });

    return ok();
  }

  const kept = QueueSchema.safeParse(await valence.storage.get(key));

  if (!kept.success) {
    return ok();
  }

  return ok({
    playQueue: {
      current: kept.data.current,
      position: kept.data.positionMs,
      username: person.login,
      changed: kept.data.changed,
      changedBy: kept.data.changedBy,
      entry: await songsOf(valence, person.profileId, kept.data.ids),
    },
  });
};

export { answerPlayQueue };
