import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Lookups } from './findWatchFor';
import { findWatchFor } from './findWatchFor';
import type { HistoryJob } from './HistoryJob';
import type { JobKind } from './JobKind';
import { jobKeyFor } from './jobKeyFor';
import { nameOf } from './nameOf';
import { readHistoryJob } from './readHistoryJob';
import { readHistoryPage } from './readHistoryPage';
import { IMPORTING } from './IMPORTING';
import { traktSessionFor } from './traktSessionFor';

const MOST_UNMATCHED_KEPT = 200;

/**
 * How long a run keeps starting new pages, well inside the 30 seconds Valence gives each call to a
 * plugin, since one page can take Trakt several seconds to send.
 */
const BUDGET_MS = 8000;

/**
 * One step of `continueHistoryJob`, once it is sure nothing else is carrying the same read on.
 *
 * @param valence - The host.
 * @param kind - Which read.
 * @param profileId - Whose.
 * @param now - The time now.
 * @param budgetMs - How long to keep reading pages.
 * @returns The read as it now stands, or nothing where none was started.
 */
const carryOn = async (
  valence: ValenceHost,
  kind: JobKind,
  profileId: string,
  now: Date,
  budgetMs: number,
): Promise<HistoryJob | null> => {
  const job = await readHistoryJob(valence, kind, profileId);
  const session = await traktSessionFor(valence, profileId);

  if (job === null || job.finishedAt !== null || session === null) {
    return job;
  }

  const started = Date.now();
  const finished = new Set(
    (await valence.viewing.progress(profileId))
      .filter((each) => each.isFinished)
      .map((each) => each.mediaId),
  );
  const lookups: Lookups = { titles: new Map(), episodes: new Map() };
  let isDone = false;

  do {
    const { watches, pages } = await readHistoryPage(valence, session, job.page, job);

    job.pages = pages ?? job.pages;

    for (const watch of watches) {
      const mediaId = await findWatchFor(valence, profileId, watch, lookups);

      job.plays += 1;

      if (mediaId === null) {
        const name = nameOf(watch);

        if (!job.unmatched.includes(name) && job.unmatched.length < MOST_UNMATCHED_KEPT) {
          job.unmatched.push(name);
        }

        continue;
      }

      job.matched += 1;

      if (!finished.has(mediaId)) {
        await valence.viewing.markWatched(profileId, mediaId, watch.watchedAt);
        finished.add(mediaId);
        job.marked += 1;
      }
    }

    isDone = watches.length === 0 || (job.pages !== null && job.page >= job.pages);
    job.page += 1;
  } while (!isDone && Date.now() - started < budgetMs);

  job.finishedAt = isDone ? now.toISOString() : null;
  await valence.storage.set(jobKeyFor(kind, profileId), job);

  if (isDone && kind === 'import') {
    await valence.notifications.send(profileId, {
      title: 'Trakt history imported',
      body: `Found ${job.matched.toString()} of ${job.plays.toString()} plays in your library and marked ${job.marked.toString()} watched.`,
    });
  }

  return job;
};

/**
 * Carries somebody's import or sync on by as many pages of their history as fit in one run: finds
 * each play's film or episode in the library and marks it watched, at the time it was watched on
 * Trakt, where Valence does not already have it finished. Stops by itself when the pages run out,
 * and tells them how an import went.
 *
 * @param valence - The host.
 * @param kind - An import or a sync.
 * @param profileId - Whose history.
 * @param now - The time now.
 * @param budgetMs - How long to keep starting new pages; at least one is always read.
 * @returns The job as it now stands, or nothing where none was started or Trakt is not connected.
 */
const continueHistoryJob = async (
  valence: ValenceHost,
  kind: JobKind,
  profileId: string,
  now: Date,
  budgetMs: number = BUDGET_MS,
): Promise<HistoryJob | null> => {
  const guard = `${kind}:${profileId}`;

  if (IMPORTING.has(guard)) {
    return readHistoryJob(valence, kind, profileId);
  }

  IMPORTING.add(guard);

  try {
    return await carryOn(valence, kind, profileId, now, budgetMs);
  } finally {
    IMPORTING.delete(guard);
  }
};

export { continueHistoryJob };
