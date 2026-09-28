import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { ImportedTrack } from './ImportedTrack';
import type { SourcePlaylist } from './SourcePlaylist';

const MOST_PAGES = 20;

const ItemsSchema = z.object({
  items: z.array(
    z.object({
      track: z
        .object({
          name: z.string(),
          artists: z.array(z.object({ name: z.string() })),
          album: z.object({ name: z.string() }).nullable(),
          external_ids: z.object({ isrc: z.string().optional() }).optional(),
        })
        .nullable(),
    }),
  ),
  next: z.string().nullable(),
});

const PlaylistSchema = z.object({ name: z.string(), tracks: ItemsSchema });

/**
 * Reads a Spotify playlist and every song on it, following its pages.
 *
 * @param valence - The host.
 * @param token - A Spotify token.
 * @param id - The playlist.
 * @returns The playlist.
 */
const readSpotifyPlaylist = async (
  valence: ValenceHost,
  token: string,
  id: string,
): Promise<SourcePlaylist> => {
  const headers = { authorization: `Bearer ${token}` };
  const first = readJsonAs(
    await valence.http.fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}?fields=name,tracks(items(track(name,artists(name),album(name),external_ids(isrc))),next)`,
      { headers },
    ),
    PlaylistSchema,
    'Spotify',
  );
  const tracks: ImportedTrack[] = [];
  let page: z.infer<typeof ItemsSchema> | null = first.tracks;

  for (let read = 0; page !== null && read < MOST_PAGES; read += 1) {
    for (const { track } of page.items) {
      if (track !== null) {
        tracks.push({
          title: track.name,
          artist: track.artists[0]?.name ?? '',
          album: track.album?.name ?? null,
          isrc: track.external_ids?.isrc ?? null,
        });
      }
    }

    page =
      page.next === null
        ? null
        : readJsonAs(await valence.http.fetch(page.next, { headers }), ItemsSchema, 'Spotify');
  }

  return { source: 'spotify', id, name: first.name, tracks };
};

export { readSpotifyPlaylist };
