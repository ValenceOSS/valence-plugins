import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { AnimeEntry } from './AnimeEntry';
import { connectedLists } from './connectedLists';
import type { ImportJob } from './ImportJob';
import { jobKeyFor } from './jobKeyFor';
import { readAniListEntries } from './readAniListEntries';
import { readMalEntries } from './readMalEntries';

/**
 * Starts importing somebody's lists: reads every connected list, keeps only what they have begun
 * watching, and folds a show on both lists into one entry carrying both ids and the furthest
 * progress. The work itself happens a few shows at a time, in `continueImport`.
 *
 * @param valence - The host.
 * @param profileId - Whose lists.
 * @param now - The time now.
 * @returns The new import.
 */
const startImport = async (
  valence: ValenceHost,
  profileId: string,
  now: Date,
): Promise<ImportJob> => {
  const lists = await connectedLists(valence, profileId);
  const read = await Promise.all(
    lists.map(({ provider, token }) =>
      provider === 'anilist' ? readAniListEntries(valence, token) : readMalEntries(valence, token),
    ),
  );
  const byMal = new Map<string, AnimeEntry>();
  const entries: AnimeEntry[] = [];

  for (const entry of read.flat().filter((each) => each.progress > 0)) {
    const twin = entry.malId === null ? undefined : byMal.get(entry.malId);

    if (twin === undefined) {
      entries.push(entry);

      if (entry.malId !== null) {
        byMal.set(entry.malId, entry);
      }
    } else {
      twin.anilistId ??= entry.anilistId;
      twin.progress = Math.max(twin.progress, entry.progress);
      twin.titles = [...new Set([...twin.titles, ...entry.titles])];
    }
  }

  const job: ImportJob = {
    entries,
    next: 0,
    matched: 0,
    marked: 0,
    unmatched: [],
    startedAt: now.toISOString(),
    finishedAt: null,
  };

  await valence.storage.set(jobKeyFor(profileId), job);

  return job;
};

export { startImport };
