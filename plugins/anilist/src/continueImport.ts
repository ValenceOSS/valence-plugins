import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { episodeKeyFor } from './episodeKeyFor';
import { findSeriesFor } from './findSeriesFor';
import type { ImportJob } from './ImportJob';
import { jobKeyFor } from './jobKeyFor';
import { orderedEpisodes } from './orderedEpisodes';
import { readImportJob } from './readImportJob';
import { seriesKeyFor } from './seriesKeyFor';

const SHOWS_AT_A_TIME = 8;

/**
 * Carries somebody's import on by a few shows: finds each in the library, marks as watched the
 * episodes their list says they have seen and Valence does not yet know about, and remembers which
 * list entry each episode belongs to so watching more of it can be passed back. Stops by itself
 * when there is nothing left, and tells them how it went.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @param now - The time now.
 * @returns The import as it now stands, or nothing where none was started.
 */
const continueImport = async (
  valence: ValenceHost,
  profileId: string,
  now: Date,
): Promise<ImportJob | null> => {
  const job = await readImportJob(valence, profileId);

  if (job === null || job.finishedAt !== null) {
    return job;
  }

  const finished = new Set(
    (await valence.viewing.progress(profileId))
      .filter((each) => each.isFinished)
      .map((each) => each.mediaId),
  );

  for (const entry of job.entries.slice(job.next, job.next + SHOWS_AT_A_TIME)) {
    const series = await findSeriesFor(valence, entry);

    if (series === null) {
      job.unmatched.push(entry.titles[0] ?? entry.id);

      continue;
    }

    job.matched += 1;
    await valence.storage.set(seriesKeyFor(series.id), {
      anilistId: entry.anilistId,
      malId: entry.malId,
      title: entry.titles[0] ?? series.title,
    });

    const episodes = orderedEpisodes(await valence.library.episodes(series.id));

    for (const [at, episode] of episodes.entries()) {
      await valence.storage.set(episodeKeyFor(profileId, episode.id), {
        anilistId: entry.anilistId,
        malId: entry.malId,
        number: at + 1,
        episodes: entry.episodes,
      });

      if (at < entry.progress && !finished.has(episode.id)) {
        await valence.viewing.markWatched(profileId, episode.id);
        job.marked += 1;
      }
    }
  }

  job.next = Math.min(job.entries.length, job.next + SHOWS_AT_A_TIME);

  if (job.next >= job.entries.length) {
    job.finishedAt = now.toISOString();
    await valence.notifications.send(profileId, {
      title: 'Anime list imported',
      body: `Matched ${job.matched.toString()} of ${job.entries.length.toString()} shows and marked ${job.marked.toString()} episodes watched.`,
    });
  }

  await valence.storage.set(jobKeyFor(profileId), job);

  return job;
};

export { continueImport };
