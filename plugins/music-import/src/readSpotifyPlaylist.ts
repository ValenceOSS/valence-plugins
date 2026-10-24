import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { ImportedTrack } from './ImportedTrack';
import type { SourcePlaylist } from './SourcePlaylist';

const MOST_PAGES = 40;

const ItemsSchema = z.object({
  items: z.array(
    z.object({
      item: z
        .object({
          type: z.string().optional(),
          name: z.string(),
          artists: z.array(z.object({ name: z.string() })).default([]),
          album: z.object({ name: z.string() }).nullable().optional(),
          external_ids: z.object({ isrc: z.string().optional() }).optional(),
        })
        .nullable(),
    }),
  ),
  next: z.string().nullable(),
});

const PlaylistSchema = z.object({ name: z.string(), items: ItemsSchema.nullish() });

/**
 * Reads a Spotify playlist and every song on it, following its pages. Spotify shares the songs only
 * of playlists the person made or collaborates on, and leaves podcast episodes out.
 *
 * @param valence - The host.
 * @param token - The person's Spotify token.
 * @param id - The playlist.
 * @returns The playlist, or a sentence saying why its songs could not be read.
 */
const readSpotifyPlaylist = async (
  valence: ValenceHost,
  token: string,
  id: string,
): Promise<SourcePlaylist | string> => {
  const headers = { authorization: `Bearer ${token}` };
  const first = readJsonAs(
    await valence.http.fetch(
      `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}?additional_types=track,episode&fields=name,items(items(item(type,name,artists(name),album(name),external_ids(isrc))),next)`,
      { headers },
    ),
    PlaylistSchema,
    'Spotify',
  );

  if (first.items === undefined || first.items === null) {
    return 'Spotify only shares the songs of playlists you made or collaborate on.';
  }

  const tracks: ImportedTrack[] = [];
  let page: z.infer<typeof ItemsSchema> | null = first.items;
  let read = 0;

  for (; page !== null && read < MOST_PAGES; read += 1) {
    for (const { item } of page.items) {
      if (item !== null && (item.type ?? 'track') === 'track') {
        tracks.push({
          title: item.name,
          artist: item.artists[0]?.name ?? '',
          album: item.album?.name ?? null,
          isrc: item.external_ids?.isrc ?? null,
        });
      }
    }

    page =
      page.next === null
        ? null
        : readJsonAs(await valence.http.fetch(page.next, { headers }), ItemsSchema, 'Spotify');
  }

  return { source: 'spotify', id, name: first.name, tracks, isCut: page !== null };
};

export { readSpotifyPlaylist };
