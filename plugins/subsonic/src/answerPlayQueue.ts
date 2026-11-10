import { z } from 'zod';
import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { songsOf } from './songsOf';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';

const MOST_QUEUED = 2000;

const MOST_ID_CHARACTERS = 200;

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
  { valence, person, asked, receivedAt, ok, failed }: Answering,
  endpoint: 'getPlayQueue' | 'savePlayQueue',
): Promise<SubsonicReply> => {
  const key = `queue:${person.profileId}`;

  if (endpoint === 'savePlayQueue') {
    const ids = asked
      .texts('id')
      .filter((id) => id.length <= MOST_ID_CHARACTERS)
      .slice(0, MOST_QUEUED);
    const current = asked.text('current');

    if (ids.length === 0) {
      const cleared = await valence.storage.delete(key).then(
        () => true,
        () => false,
      );

      return cleared ? ok() : failed(SUBSONIC_ERROR.generic, 'The play queue couldn’t be cleared.');
    }

    const saved = await valence.storage
      .set(key, {
        ids,
        current: current !== null && ids.includes(current) ? current : null,
        positionMs: asked.number('position', 0, Number.MAX_SAFE_INTEGER),
        changed: receivedAt,
        changedBy: (asked.text('c') ?? '').slice(0, 100),
      })
      .then(
        () => true,
        () => false,
      );

    return saved ? ok() : failed(SUBSONIC_ERROR.generic, 'The play queue couldn’t be kept.');
  }

  const read = await valence.storage.get(key).then(
    (value) => ({ value }),
    () => null,
  );

  if (read === null) {
    return failed(SUBSONIC_ERROR.generic, 'The play queue couldn’t be read.');
  }

  const kept = QueueSchema.safeParse(read.value);

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
