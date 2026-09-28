import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { jobKeyFor } from './jobKeyFor';
import type { MusicImportJob } from './MusicImportJob';
import { readMusicImportJob } from './readMusicImportJob';

const SONGS_AT_A_TIME = 25;

/**
 * Carries a playlist import on by a few songs: adds each song the library has to the playlist in
 * order, and, where asked, requests the album of each song it does not, once per album. Finishes by
 * itself, and tells the importer how it went.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @param now - The time now.
 * @returns The import as it now stands, or nothing where none was started.
 */
const continueMusicImport = async (
  valence: ValenceHost,
  profileId: string,
  now: Date,
): Promise<MusicImportJob | null> => {
  const job = await readMusicImportJob(valence, profileId);

  if (job === null || job.finishedAt !== null) {
    return job;
  }

  const adding: string[] = [];

  for (const track of job.tracks.slice(job.next, job.next + SONGS_AT_A_TIME)) {
    const found = await valence.music.findTrack({
      title: track.title,
      artist: track.artist,
      ...(track.album === null ? {} : { album: track.album }),
      ...(track.isrc === null ? {} : { isrc: track.isrc }),
    });

    if (found !== null) {
      adding.push(found.id);

      continue;
    }

    job.missing.push(`${track.title}, ${track.artist}`);

    if (!job.shouldRequest) {
      continue;
    }

    const hits = await valence.requests.searchCatalogue(
      `${track.artist} ${track.album ?? track.title}`,
      'album',
    );
    const hit = hits.find((each) => !each.isInLibrary);

    if (hit !== undefined && !hit.isRequested && !job.requested.includes(hit.catalogueId)) {
      const made = await valence.requests.create(profileId, {
        catalogueId: hit.catalogueId,
        kind: 'album',
      });

      if (made.status === 'made') {
        job.requested.push(hit.catalogueId);
      }
    }
  }

  if (adding.length > 0) {
    await valence.playlists.add(profileId, job.playlistId, adding);
    job.found += adding.length;
  }

  job.next = Math.min(job.tracks.length, job.next + SONGS_AT_A_TIME);

  if (job.next >= job.tracks.length) {
    job.finishedAt = now.toISOString();
    await valence.notifications.send(profileId, {
      title: `${job.name} imported`,
      body: `${job.found.toString()} of ${job.tracks.length.toString()} songs are in your playlist${
        job.requested.length === 0
          ? '.'
          : `, and ${job.requested.length.toString()} albums were requested.`
      }`,
    });
  }

  await valence.storage.set(jobKeyFor(profileId), job);

  return job;
};

export { continueMusicImport };
