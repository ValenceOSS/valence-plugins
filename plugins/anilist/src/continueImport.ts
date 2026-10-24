import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { AnimeEntry } from './AnimeEntry';
import { IMPORTING } from './IMPORTING';
import type { ImportJob } from './ImportJob';
import { jobKeyFor } from './jobKeyFor';
import { linkKeyFor } from './linkKeyFor';
import { chainsOf } from './chainsOf';
import { matchEntry } from './matchEntry';
import { positionsOf } from './positionsOf';
import { readImportJob } from './readImportJob';
import type { SeriesLink } from './SeriesLink';
import { SeriesLinkSchema } from './SeriesLink';

const SHOWS_AT_A_TIME = 8;

const MOST_BRIDGE_EPISODES = 3;

/**
 * How many of a list entry's episodes somebody has seen: all of them for a show they completed,
 * including one they are watching again, and otherwise as far as the list says, never more than
 * the entry has.
 *
 * @param entry - The list entry.
 * @returns The number of episodes seen.
 */
const seenOf = (entry: AnimeEntry): number => {
  const seen =
    entry.status === 'completed' || entry.status === 'repeating'
      ? Math.max(entry.progress, entry.episodes ?? 0)
      : entry.progress;

  return entry.episodes === null ? seen : Math.min(seen, entry.episodes);
};

/**
 * One step of `continueImport`, once it is sure nothing else is carrying the same import on.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @param now - The time now.
 * @returns The import as it now stands, or nothing where none was started.
 */
const carryOn = async (
  valence: ValenceHost,
  profileId: string,
  now: Date,
): Promise<ImportJob | null> => {
  const job = await readImportJob(valence, profileId);

  if (job === null || job.finishedAt !== null) {
    return job;
  }

  const shows = job.entries.slice(job.next, job.next + SHOWS_AT_A_TIME);
  const chains = await chainsOf(valence, shows);
  const finished = new Set(
    (await valence.viewing.progress(profileId))
      .filter((each) => each.isFinished)
      .map((each) => each.mediaId),
  );

  for (const entry of shows) {
    const match = await matchEntry(valence, entry, chains.get(`${entry.provider}:${entry.id}`));

    if (match === null) {
      job.unmatched.push(entry.titles[0] ?? entry.id);

      continue;
    }

    job.matched += 1;

    const { at: positions, starts } = positionsOf(await valence.library.episodes(match.series.id));
    const snapped = new Map(
      match.seasons.map(({ season, offset }) => {
        const near =
          offset === 0 || starts.length < 2
            ? undefined
            : starts
                .filter((start) => Math.abs(start - offset) <= MOST_BRIDGE_EPISODES)
                .sort((left, right) => Math.abs(left - offset) - Math.abs(right - offset))[0];

        return [
          near ?? offset,
          {
            anilistId: season.anilistId === '' ? null : season.anilistId,
            malId: season.malId,
            title: season.titles[0] ?? match.series.title,
            offset: near ?? offset,
            episodes: season.episodes,
          },
        ] as const;
      }),
    );
    const placed = [...snapped.values()];
    const own = placed.at(-1)?.offset ?? 0;
    const seen = seenOf(entry);

    for (const [mediaId, at] of positions) {
      if (at >= own && at < own + seen && !finished.has(mediaId)) {
        await valence.viewing.markWatched(profileId, mediaId);
        job.marked += 1;
      }
    }

    const kept = SeriesLinkSchema.safeParse(
      await valence.storage.get(linkKeyFor(profileId, match.series.id)),
    );
    const link: SeriesLink = {
      entries: [
        ...(kept.success ? kept.data.entries : []).filter(
          (each) => !placed.some((place) => place.offset === each.offset),
        ),
        ...placed,
      ].sort((left, right) => left.offset - right.offset),
    };

    await valence.storage.set(linkKeyFor(profileId, match.series.id), link);
  }

  job.next = Math.min(job.entries.length, job.next + SHOWS_AT_A_TIME);
  job.finishedAt = job.next >= job.entries.length ? now.toISOString() : null;
  await valence.storage.set(jobKeyFor(profileId), job);

  if (job.finishedAt !== null) {
    await valence.notifications.send(profileId, {
      title: 'Anime list imported',
      body: `Matched ${job.matched.toString()} of ${job.entries.length.toString()} shows and marked ${job.marked.toString()} episodes watched.`,
    });
  }

  return job;
};

/**
 * Carries somebody's import on by a few shows: finds each entry's programme by the entry or the
 * nearest season before it the library knows, marks as watched the episodes of the entry the list
 * says they have seen and Valence does not yet know about, and keeps which seasons the programme
 * was matched to, the entry's and those before it, so watching more of it can be passed back. Stops
 * by itself when there is nothing left, and tells them how it went. A season placed a few episodes
 * from where one of the programme's seasons starts, with a short web episode or a recap between,
 * is moved onto it. Only one carries a given import on at a time.
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
  if (IMPORTING.has(profileId)) {
    return readImportJob(valence, profileId);
  }

  IMPORTING.add(profileId);

  try {
    return await carryOn(valence, profileId, now);
  } finally {
    IMPORTING.delete(profileId);
  }
};

export { continueImport };
