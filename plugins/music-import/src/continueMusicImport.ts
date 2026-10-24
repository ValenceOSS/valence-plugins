import type { MissingSong, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { finishMusicImport } from './finishMusicImport';
import { IMPORTING } from './IMPORTING';
import { jobKeyFor } from './jobKeyFor';
import type { MusicImportJob } from './MusicImportJob';
import { readMusicImportJob } from './readMusicImportJob';
import { songOf } from './songOf';

const SONGS_AT_A_TIME = 25;

/**
 * Carries a playlist import on by a few songs: adds each song to the playlist in order, one the
 * library does not have as a missing song in its place, which Valence fills in once it arrives.
 * How far it got is saved before the songs are added, so a failure afterwards never adds them
 * twice; a failed add is put back and tried again next time, unless the playlist itself is gone,
 * which stops the import. Only one carries a given import on at a time.
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
  if (IMPORTING.has(profileId)) {
    return readMusicImportJob(valence, profileId);
  }

  IMPORTING.add(profileId);

  try {
    const job = await readMusicImportJob(valence, profileId);

    if (job === null || job.finishedAt !== null) {
      return job;
    }

    const adding: (string | MissingSong)[] = [];
    const missing: string[] = [];

    for (const track of job.tracks.slice(job.next, job.next + SONGS_AT_A_TIME)) {
      const song = songOf(track);

      if (song === null) {
        continue;
      }

      const found = await valence.music.findTrack({
        title: song.title,
        artist: song.artist,
        ...(song.album === null || song.album === undefined ? {} : { album: song.album }),
        ...(song.isrc === null ? {} : { isrc: song.isrc }),
      });

      if (found === null) {
        missing.push(`${song.title}, ${song.artist}`);
        adding.push({ title: song.title, artist: song.artist, album: song.album ?? null });
      } else {
        adding.push(found.id);
      }
    }

    const moved: MusicImportJob = {
      ...job,
      next: Math.min(job.tracks.length, job.next + SONGS_AT_A_TIME),
      found: job.found + adding.filter((item) => typeof item === 'string').length,
      missing: [...job.missing, ...missing],
    };

    await valence.storage.set(jobKeyFor(profileId), moved);

    if (adding.length > 0) {
      try {
        await valence.playlists.add(profileId, job.playlistId, adding);
      } catch (failure) {
        if ((await valence.playlists.read(profileId, job.playlistId).catch(() => job)) === null) {
          return await finishMusicImport(valence, profileId, job, now, 'playlistGone');
        }

        await valence.storage.set(jobKeyFor(profileId), job).catch(() => undefined);

        throw failure;
      }
    }

    return moved.next >= moved.tracks.length
      ? await finishMusicImport(valence, profileId, moved, now, 'done')
      : moved;
  } finally {
    IMPORTING.delete(profileId);
  }
};

export { continueMusicImport };
