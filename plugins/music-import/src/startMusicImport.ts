import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { cutTo } from '@Shared/cutTo';
import { jobKeyFor } from './jobKeyFor';
import type { MusicImportJob } from './MusicImportJob';
import type { SourcePlaylist } from './SourcePlaylist';

const MOST_NAME_CHARACTERS = 100;

/**
 * Starts importing a playlist: makes the Valence playlist the songs will go into, and keeps the
 * songs to work through a few at a time in `continueMusicImport`.
 *
 * @param valence - The host.
 * @param profileId - Who is importing, and whose playlist it becomes.
 * @param playlist - The playlist read from Spotify or Apple Music.
 * @param shouldRequest - Whether to ask for the albums of the songs the library does not have.
 * @param now - The time now.
 * @returns The new import.
 */
const startMusicImport = async (
  valence: ValenceHost,
  profileId: string,
  playlist: SourcePlaylist,
  shouldRequest: boolean,
  now: Date,
): Promise<MusicImportJob> => {
  const name =
    playlist.name.trim() === ''
      ? 'Imported playlist'
      : cutTo(playlist.name.trim(), MOST_NAME_CHARACTERS);
  const made = await valence.playlists.create(profileId, {
    name,
    description: `Imported from ${playlist.source === 'spotify' ? 'Spotify' : 'Apple Music'}`,
  });
  const job: MusicImportJob = {
    source: playlist.source,
    name,
    tracks: playlist.tracks,
    next: 0,
    playlistId: made.id,
    found: 0,
    missing: [],
    shouldRequest,
    isCut: playlist.isCut,
    total: playlist.tracks.length,
    isStopped: false,
    startedAt: now.toISOString(),
    finishedAt: null,
  };

  await valence.storage.set(jobKeyFor(profileId), job);

  return job;
};

export { startMusicImport };
