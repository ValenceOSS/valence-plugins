import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { LastfmKeys } from './LastfmKeys';
import type { Links } from './Links';
import type { PlaylistSource } from './PLAYLIST_SOURCES';
import type { MadeFor } from './readListenBrainzPlaylist';
import { readListenBrainzPlaylist } from './readListenBrainzPlaylist';
import { readLovedTracks } from './readLovedTracks';
import type { SourcePlaylist } from './SourcePlaylist';

/**
 * Reads a playlist from whichever service makes it.
 *
 * @param valence - The host.
 * @param source - Which playlist.
 * @param links - The person's connections.
 * @param keys - The plugin's Last.fm keys, where set.
 * @param madeFor - ListenBrainz's playlists already read this run.
 * @returns The playlist, or nothing where its service is not connected or has none for them.
 */
const readSourcePlaylist = (
  valence: ValenceHost,
  source: PlaylistSource,
  links: Links,
  keys: LastfmKeys | null,
  madeFor: MadeFor,
): Promise<SourcePlaylist | null> =>
  source.service === 'listenbrainz'
    ? links.listenbrainz === null
      ? Promise.resolve(null)
      : readListenBrainzPlaylist(valence, links.listenbrainz, source.id, madeFor)
    : links.lastfm === null || keys === null
      ? Promise.resolve(null)
      : readLovedTracks(valence, keys, links.lastfm);

export { readSourcePlaylist };
