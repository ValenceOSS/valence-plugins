import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { continueHistoryJob } from './continueHistoryJob';
import { readHistoryJob } from './readHistoryJob';
import { startHistoryJob } from './startHistoryJob';
import { traktSessionFor } from './traktSessionFor';

const RESYNC_AFTER_HOURS = 24;

/** How far before the last read a sync starts, so a play logged late on Trakt is still found. */
const OVERLAP_HOURS = 1;

/**
 * The scheduled run, for each person with Trakt connected: carries on an import under way,
 * starts one for somebody who never had one, and once a day reads the plays added since the last
 * read, so watching elsewhere reaches Valence too.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @returns How many people's history moved on.
 */
const syncEveryone = async (valence: ValenceHost, now: Date = new Date()): Promise<number> => {
  let moved = 0;

  for (const profile of await valence.profiles.list()) {
    if ((await traktSessionFor(valence, profile.id)) === null) {
      continue;
    }

    try {
      const imported = await readHistoryJob(valence, 'import', profile.id);

      if (imported === null || imported.finishedAt === null) {
        if (imported === null) {
          await startHistoryJob(valence, 'import', profile.id, null, now);
        }

        await continueHistoryJob(valence, 'import', profile.id, now);
        moved += 1;

        continue;
      }

      const synced = await readHistoryJob(valence, 'sync', profile.id);
      const lastRead = [imported, synced]
        .flatMap((job) => (job === null ? [] : [Date.parse(job.until)]))
        .reduce((latest, each) => Math.max(latest, each));

      const isDue =
        (synced === null || synced.finishedAt !== null) &&
        now.getTime() - lastRead > RESYNC_AFTER_HOURS * 3_600_000;

      if (isDue) {
        await startHistoryJob(
          valence,
          'sync',
          profile.id,
          new Date(lastRead - OVERLAP_HOURS * 3_600_000).toISOString(),
          now,
        );
      }

      if (isDue || synced?.finishedAt === null) {
        await continueHistoryJob(valence, 'sync', profile.id, now);
        moved += 1;
      }
    } catch (failure) {
      valence.log.warn('Could not sync a Trakt history', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }
  }

  return moved;
};

export { syncEveryone };
