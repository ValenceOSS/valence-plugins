import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { connectedLists } from './connectedLists';
import { continueImport } from './continueImport';
import { forgetProfile } from './forgetProfile';
import { IMPORTING } from './IMPORTING';
import { jobKeyFor } from './jobKeyFor';
import { readImportJob } from './readImportJob';
import { startImport } from './startImport';

const RESYNC_AFTER_HOURS = 24;

const BUDGET_MS = 20_000;

const STARTS_FROM = 'syncStartsFrom';

const OLD_KEYS_AT_A_TIME = 500;

const OLD_PREFIXES = ['episode:', 'series:'] as const;

/**
 * The scheduled run: carries on any import under way, and once a day reads again the lists of
 * everyone who has imported, so progress made elsewhere reaches Valence too. Nobody's list is read
 * until they import it themselves, and an import from before seasons were matched is read again at
 * once. Each person is taken in turn, starting a little further along each run, until the run's
 * time is up, and one person's failure never stops the rest, though AniList saying it is asked too
 * often ends the run. Anything kept for a profile that no longer exists is let go, as is what
 * earlier versions kept per episode.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @param budgetMs - How long to keep starting work; the rest waits for the next run.
 * @returns How many people's imports moved on.
 */
const syncEveryone = async (
  valence: ValenceHost,
  now: Date = new Date(),
  budgetMs: number = BUDGET_MS,
): Promise<number> => {
  const deadline = Date.now() + budgetMs;
  const profiles = await valence.profiles.list();
  const everyone = new Set(profiles.map((profile) => profile.id));

  for (const key of await valence.storage.keys(jobKeyFor(''))) {
    const profileId = key.slice(jobKeyFor('').length);

    if (!everyone.has(profileId)) {
      await forgetProfile(valence, profileId).catch((failure: unknown) => {
        valence.log.warn('Could not let go of a removed profile', {
          profile: profileId,
          problem: failure instanceof Error ? failure.message : 'unknown',
        });
      });
    }
  }

  for (const prefix of OLD_PREFIXES) {
    for (const key of (await valence.storage.keys(prefix)).slice(0, OLD_KEYS_AT_A_TIME)) {
      await valence.storage.delete(key);
    }
  }

  const kept = await valence.storage.get(STARTS_FROM);
  const from = typeof kept === 'number' && profiles.length > 0 ? kept % profiles.length : 0;
  const inTurn = [...profiles.slice(from), ...profiles.slice(0, from)];
  let moved = 0;
  let visited = 0;

  for (const profile of inTurn) {
    if (Date.now() >= deadline) {
      break;
    }

    visited += 1;

    try {
      const job = await readImportJob(valence, profile.id);

      if (
        job === null ||
        IMPORTING.has(profile.id) ||
        (await connectedLists(valence, profile.id)).length === 0
      ) {
        continue;
      }

      const isStale =
        job.finishedAt !== null &&
        (!job.isLinked ||
          now.getTime() - Date.parse(job.finishedAt) > RESYNC_AFTER_HOURS * 3_600_000);

      if (isStale) {
        await startImport(valence, profile.id, now);
      }

      let going = await continueImport(valence, profile.id, now);

      while (going !== null && going.finishedAt === null && Date.now() < deadline) {
        const before = going.next;

        going = await continueImport(valence, profile.id, now);

        if (going !== null && going.finishedAt === null && going.next === before) {
          break;
        }
      }

      moved += 1;
    } catch (failure) {
      const problem = failure instanceof Error ? failure.message : 'unknown';

      valence.log.warn('Could not sync an anime list', { profile: profile.id, problem });

      if (problem.includes('answered 429')) {
        break;
      }
    }
  }

  await valence.storage.set(
    STARTS_FROM,
    profiles.length === 0 ? 0 : (from + visited) % profiles.length,
  );

  return moved;
};

export { syncEveryone };
