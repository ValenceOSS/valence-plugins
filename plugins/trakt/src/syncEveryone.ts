import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { continueHistoryJob } from './continueHistoryJob';
import { forgetProfile } from './forgetProfile';
import { readHistoryJob } from './readHistoryJob';
import { resendWatches } from './resendWatches';
import { startHistoryJob } from './startHistoryJob';
import { traktSessionFor } from './traktSessionFor';

const RESYNC_AFTER_HOURS = 24;

/** How far before the last read a sync starts, so a play logged late on Trakt is still found. */
const OVERLAP_HOURS = 1;

/** How long a run keeps starting work, leaving room under the 30 seconds Valence gives each call
 * for a call to Trakt that is slow to answer. */
const BUDGET_MS = 12_000;

/** The most a run spends reading one person's history pages. */
const PAGES_BUDGET_MS = 8_000;

const STARTS_FROM = 'syncStartsFrom';

/**
 * The scheduled run, for each person with Trakt connected: sends again the finishes Trakt couldn't
 * take, carries on an import under way, starts one for somebody who never had one, and once a day
 * reads the plays added since the last read, so watching elsewhere reaches Valence too. Each person
 * is taken in turn, starting a little further along each run, until the run's time is up, and one
 * person's failure never stops the rest. Anything kept for a profile that no longer exists is let
 * go.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @param budgetMs - How long to keep starting work; the rest waits for the next run.
 * @returns How many people's history moved on.
 */
const syncEveryone = async (
  valence: ValenceHost,
  now: Date = new Date(),
  budgetMs: number = BUDGET_MS,
): Promise<number> => {
  const deadline = Date.now() + budgetMs;
  const profiles = await valence.profiles.list();
  const everyone = new Set(profiles.map((profile) => profile.id));

  const gone = new Set<string>();

  for (const prefix of ['import:', 'sync:', 'preferences:', 'account:', 'recent:', 'push:']) {
    for (const key of await valence.storage.keys(prefix)) {
      const profileId = key.slice(prefix.length).split(':')[0] ?? '';

      if (profileId !== '' && !everyone.has(profileId)) {
        gone.add(profileId);
      }
    }
  }

  for (const profileId of gone) {
    await forgetProfile(valence, profileId).catch((failure: unknown) => {
      valence.log.warn('Could not let go of a removed profile', {
        profile: profileId,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    });
  }

  const kept = await valence.storage.get(STARTS_FROM);
  const from = typeof kept === 'number' && profiles.length > 0 ? kept % profiles.length : 0;
  let moved = 0;
  let visited = 0;

  for (const profile of [...profiles.slice(from), ...profiles.slice(0, from)]) {
    if (Date.now() >= deadline) {
      break;
    }

    visited += 1;

    try {
      const session = await traktSessionFor(valence, profile.id);

      if (session === null) {
        continue;
      }

      await resendWatches(valence, profile.id, session, now);

      const left = Math.max(0, Math.min(PAGES_BUDGET_MS, deadline - Date.now()));

      const imported = await readHistoryJob(valence, 'import', profile.id);

      if (imported === null || imported.finishedAt === null) {
        if (imported === null) {
          await startHistoryJob(valence, 'import', profile.id, null, now);
        }

        await continueHistoryJob(valence, 'import', profile.id, now, left);
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
        await continueHistoryJob(valence, 'sync', profile.id, now, left);
        moved += 1;
      }
    } catch (failure) {
      valence.log.warn('Could not sync a Trakt history', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }
  }

  await valence.storage.set(
    STARTS_FROM,
    profiles.length === 0 ? 0 : (from + visited) % profiles.length,
  );

  return moved;
};

export { syncEveryone };
