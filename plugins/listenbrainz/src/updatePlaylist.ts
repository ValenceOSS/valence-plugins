import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { fillPlaylist } from './fillPlaylist';
import { findSongFor } from './findSongFor';
import type { KeptPlaylist } from './KeptPlaylist';
import type { LastfmKeys } from './LastfmKeys';
import type { Links } from './Links';
import type { PlaylistSource } from './PLAYLIST_SOURCES';
import type { PlaylistUpdate } from './PlaylistUpdate';
import { PlaylistUpdateSchema } from './PlaylistUpdate';
import { playlistKeysFor } from './playlistKeysFor';
import type { Preferences } from './Preferences';
import { readKeptPlaylist } from './readKeptPlaylist';
import type { MadeFor } from './readListenBrainzPlaylist';
import { readSourcePlaylist } from './readSourcePlaylist';
import { PENDING_REQUESTS } from './PENDING_REQUESTS';

/** How often a service is asked whether a playlist has changed. */
const CHECK_EVERY_HOURS = 6;

/** What one run of an update did: nothing due, some songs matched, the playlist changed, or the
 * person deleted the playlist, which stops it being kept. */
type UpdateOutcome = 'idle' | 'working' | 'updated' | 'deleted';

/**
 * Keeps one of somebody's service playlists in step with a Valence playlist. Every few hours it
 * asks the service for the playlist, and when there is a new version, matches its songs to the
 * library a few at a time until the deadline. A song the library does not have keeps its place as a
 * missing song, named by the first artist it credits, since that is how a library credits it, so
 * Valence can fill it in once it arrives. Where the administrator chose to request missing albums,
 * the playlist is noted for them to be requested once it changes.
 * Once every song is matched, the Valence playlist is made or brought up to date in one go, so it
 * is never left half changed, and none is made while the service's has no songs at all. Deleting
 * the Valence playlist stops it being kept.
 *
 * @param valence - The host.
 * @param context - Whose playlist and their name, which a new playlist is named after so a household
 *   can tell everyone's apart, their connections, choices and the plugin's Last.fm keys, whether
 *   missing albums are to be requested, and what this run has already read.
 * @param source - Which service playlist.
 * @param now - The time now.
 * @param deadline - When to stop matching songs, as `Date.now()` time.
 * @returns What this run did.
 */
const updatePlaylist = async (
  valence: ValenceHost,
  context: {
    profileId: string;
    personName: string;
    links: Links;
    keys: LastfmKeys | null;
    preferences: Preferences;
    shouldRequest: boolean;
    madeFor: MadeFor;
  },
  source: PlaylistSource,
  now: Date,
  deadline: number,
): Promise<UpdateOutcome> => {
  const { profileId, preferences } = context;
  const keys = playlistKeysFor(profileId, source.id);
  const kept = await readKeptPlaylist(valence, profileId, source.id);
  const underWay = PlaylistUpdateSchema.safeParse(await valence.storage.get(keys.update));
  let update: PlaylistUpdate;

  if (underWay.success) {
    update = underWay.data;
  } else {
    if (
      kept !== null &&
      now.getTime() - Date.parse(kept.checkedAt) < CHECK_EVERY_HOURS * 3_600_000
    ) {
      return 'idle';
    }

    const playlist = await readSourcePlaylist(
      valence,
      source,
      context.links,
      context.keys,
      context.madeFor,
    );

    if (playlist === null || playlist.version === kept?.version) {
      if (kept !== null) {
        await valence.storage.set(keys.kept, { ...kept, checkedAt: now.toISOString() });
      }

      return 'idle';
    }

    if (playlist.tracks.length === 0 && kept === null) {
      return 'idle';
    }

    update = {
      version: playlist.version,
      tracks: playlist.tracks,
      next: 0,
      items: [],
    };
  }

  while (update.next < update.tracks.length && Date.now() < deadline) {
    const track = update.tracks[update.next];

    update.next += 1;

    if (track === undefined) {
      continue;
    }

    const found = await findSongFor(valence, track);

    if (found !== null) {
      update.items.push(found);

      continue;
    }

    update.items.push({
      title: track.title,
      artist: track.artist,
      album: track.album,
      releaseId: track.releaseId,
    });
  }

  if (update.next < update.tracks.length) {
    await valence.storage.set(keys.update, update);

    return 'working';
  }

  const existing = kept === null ? null : await valence.playlists.read(profileId, kept.playlistId);

  if (kept !== null && existing === null) {
    await valence.storage.delete(keys.kept);
    await valence.storage.delete(keys.update);
    await valence.storage.set(`preferences:${profileId}`, {
      ...preferences,
      keep: preferences.keep.filter((id) => id !== source.id),
    });

    return 'deleted';
  }

  const playlistId =
    kept?.playlistId ??
    (
      await valence.playlists.create(profileId, {
        name: context.personName === '' ? source.name : source.namedFor(context.personName),
        description: `Kept up to date from ${source.service === 'listenbrainz' ? 'ListenBrainz' : 'Last.fm'}.`,
      })
    ).id;
  const next: KeptPlaylist = {
    playlistId,
    version: update.version,
    entryIds: await fillPlaylist(
      valence,
      profileId,
      playlistId,
      kept?.entryIds ?? [],
      update.items,
    ),
    found: update.items.filter((item) => typeof item === 'string').length,
    total: update.tracks.length,
    checkedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await valence.storage.set(keys.kept, next);
  await valence.storage.delete(keys.update);

  if (context.shouldRequest && next.found < next.total) {
    await valence.storage.set(`${PENDING_REQUESTS}${profileId}:${source.id}`, {
      playlistId,
      name: context.personName === '' ? source.name : source.namedFor(context.personName),
    });
  }

  if (kept === null) {
    await valence.notifications.send(profileId, {
      title: `${source.name} is ready`,
      body: `${next.found.toString()} of ${next.total.toString()} songs are in your library.`,
    });
  }

  return 'updated';
};

export type { UpdateOutcome };

export { updatePlaylist };
