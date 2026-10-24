import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { requestPendingAlbums } from '@Shared/requestPendingAlbums';
import { continueMusicImport } from './continueMusicImport';
import { forgetProfile } from './forgetProfile';
import { jobKeyFor } from './jobKeyFor';

const IMPORTS_BUDGET_MS = 12_000;

const REQUESTS_START_WITHIN_MS = 13_000;

const REQUESTS_STOP_AFTER_MS = 26_000;

/**
 * The scheduled run: carries on every playlist import under way for as long as the run allows, so a
 * long playlist finishes even when nobody keeps the page open, then requests the albums of finished
 * imports' missing songs, which Valence may take a while to find. Anything kept for a profile that
 * no longer exists is let go, and a failure in one part never stops the others.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @param budgetMs - How long to keep carrying imports on; the rest waits for the next run.
 * @returns How many imports moved on.
 */
const continueEveryone = async (
  valence: ValenceHost,
  now: Date = new Date(),
  budgetMs: number = IMPORTS_BUDGET_MS,
): Promise<number> => {
  const startedAt = Date.now();
  const profiles = await valence.profiles.list();
  const everyone = new Set(profiles.map((profile) => profile.id));

  for (const key of await valence.storage.keys(jobKeyFor(''))) {
    const profileId = key.slice(jobKeyFor('').length);

    if (!everyone.has(profileId)) {
      await forgetProfile(valence, profileId);
    }
  }

  let moved = 0;

  for (const profile of profiles) {
    try {
      let job = await continueMusicImport(valence, profile.id, now);

      moved += job === null ? 0 : 1;

      while (job !== null && job.finishedAt === null && Date.now() < startedAt + budgetMs) {
        job = await continueMusicImport(valence, profile.id, now);
      }
    } catch (failure) {
      valence.log.warn('Could not carry on a playlist import', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }
  }

  try {
    await requestPendingAlbums(valence, {
      startBy: startedAt + Math.min(REQUESTS_START_WITHIN_MS, budgetMs + 1_000),
      stopBy: startedAt + REQUESTS_STOP_AFTER_MS,
    });
  } catch (failure) {
    valence.log.warn('Could not request the albums of an imported playlist', {
      problem: failure instanceof Error ? failure.message : 'unknown',
    });
  }

  return moved;
};

export { continueEveryone };
