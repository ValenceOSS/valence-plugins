import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { HistoryJob } from './HistoryJob';
import type { JobKind } from './JobKind';
import { jobKeyFor } from './jobKeyFor';

/**
 * Starts reading somebody's Trakt history: all of it for an import, or the plays watched since a
 * time for the daily sync. Only plays up to now are read, so plays added while it runs do not
 * move the pages under it. The work happens a page at a time, in `continueHistoryJob`.
 *
 * @param valence - The host.
 * @param kind - An import or a sync.
 * @param profileId - Whose history.
 * @param since - For a sync, the time to read plays from.
 * @param now - The time now.
 * @returns The new job.
 */
const startHistoryJob = async (
  valence: ValenceHost,
  kind: JobKind,
  profileId: string,
  since: string | null,
  now: Date,
): Promise<HistoryJob> => {
  const job: HistoryJob = {
    since,
    until: now.toISOString(),
    page: 1,
    pages: null,
    plays: 0,
    matched: 0,
    marked: 0,
    unmatched: [],
    startedAt: now.toISOString(),
    finishedAt: null,
  };

  await valence.storage.set(jobKeyFor(kind, profileId), job);

  return job;
};

export { startHistoryJob };
