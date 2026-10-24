import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { cutTo } from '@Shared/cutTo';
import { pendingRequestKeyFor } from '@Shared/pendingRequestKeyFor';
import type { PendingRequest } from '@Shared/PendingRequest';
import { jobKeyFor } from './jobKeyFor';
import type { MusicImportJob } from './MusicImportJob';
import { totalOf } from './totalOf';

/**
 * Finishes an import: keeps how it went and lets go of its songs, which a finished import no
 * longer needs. One that got every song in leaves its playlist for `requestPendingAlbums` where
 * the importer asked, and tells them; one whose playlist was removed says why it stopped; one they
 * stopped themselves says nothing, since they are on the page.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @param job - The import, as far as it got.
 * @param now - The time now.
 * @param ending - Why it is finishing.
 * @returns The finished import.
 */
const finishMusicImport = async (
  valence: ValenceHost,
  profileId: string,
  job: MusicImportJob,
  now: Date,
  ending: 'done' | 'stopped' | 'playlistGone',
): Promise<MusicImportJob> => {
  const done: MusicImportJob = {
    ...job,
    tracks: [],
    total: totalOf(job),
    isStopped: ending !== 'done',
    finishedAt: now.toISOString(),
  };

  await valence.storage.set(jobKeyFor(profileId), done);

  if (ending === 'done' && done.shouldRequest && done.missing.length > 0) {
    const pending: PendingRequest = { playlistId: done.playlistId, name: done.name };

    await valence.storage.set(pendingRequestKeyFor(profileId, done.playlistId), pending);
  }

  if (ending !== 'stopped') {
    await valence.notifications.send(profileId, {
      title: cutTo(`${done.name} ${ending === 'done' ? 'imported' : 'stopped importing'}`, 100),
      body: `${done.found.toString()} of ${totalOf(done).toString()} songs are in your library.${
        ending === 'done' && done.isCut ? ' The playlist was too long to read all of it.' : ''
      }${ending === 'playlistGone' ? ' Its Valence playlist was removed, so the rest were not added.' : ''}`,
    });
  }

  return done;
};

export { finishMusicImport };
