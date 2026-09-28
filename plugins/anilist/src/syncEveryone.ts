import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { connectedLists } from './connectedLists';
import { continueImport } from './continueImport';
import { readImportJob } from './readImportJob';
import { startImport } from './startImport';

const RESYNC_AFTER_HOURS = 24;

/**
 * The scheduled run: carries on any import that is under way, and once a day starts a fresh one
 * for each person with a connected list, so progress made elsewhere reaches Valence too.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @returns How many people's imports moved on.
 */
const syncEveryone = async (valence: ValenceHost, now: Date = new Date()): Promise<number> => {
  let moved = 0;

  for (const profile of await valence.profiles.list()) {
    if ((await connectedLists(valence, profile.id)).length === 0) {
      continue;
    }

    const job = await readImportJob(valence, profile.id);
    const isStale =
      job === null ||
      (job.finishedAt !== null &&
        now.getTime() - Date.parse(job.finishedAt) > RESYNC_AFTER_HOURS * 3_600_000);

    if (isStale) {
      await startImport(valence, profile.id, now);
    }

    try {
      await continueImport(valence, profile.id, now);
      moved += 1;
    } catch (failure) {
      valence.log.warn('Could not sync an anime list', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }
  }

  return moved;
};

export { syncEveryone };
