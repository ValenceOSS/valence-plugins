import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { ImportedTrack } from './ImportedTrack';
import type { SourcePlaylist } from './SourcePlaylist';

const API = 'https://api.music.apple.com';

const MOST_PAGES = 20;

const TracksSchema = z.object({
  data: z.array(
    z.object({
      attributes: z
        .object({
          name: z.string(),
          artistName: z.string(),
          albumName: z.string().optional(),
          isrc: z.string().optional(),
        })
        .optional(),
    }),
  ),
  next: z.string().optional(),
});

const PlaylistSchema = z.object({
  data: z
    .array(
      z.object({
        attributes: z.object({ name: z.string() }),
        relationships: z.object({ tracks: TracksSchema }),
      }),
    )
    .min(1),
});

/**
 * Reads a public Apple Music playlist and every song on it, following its pages.
 *
 * @param valence - The host.
 * @param developerToken - The Apple Music developer token from the plugin's settings.
 * @param storefront - The country the link was shared from, such as `gb`.
 * @param id - The playlist, such as `pl.f4d1…`.
 * @returns The playlist.
 */
const readApplePlaylist = async (
  valence: ValenceHost,
  developerToken: string,
  storefront: string,
  id: string,
): Promise<SourcePlaylist> => {
  const headers = { authorization: `Bearer ${developerToken}` };
  const playlist = readJsonAs(
    await valence.http.fetch(
      `${API}/v1/catalog/${storefront}/playlists/${encodeURIComponent(id)}?include=tracks`,
      {
        headers,
      },
    ),
    PlaylistSchema,
    'Apple Music',
  ).data[0];
  const tracks: ImportedTrack[] = [];
  let page: z.infer<typeof TracksSchema> | null = playlist?.relationships.tracks ?? null;

  for (let read = 0; page !== null && read < MOST_PAGES; read += 1) {
    for (const { attributes } of page.data) {
      if (attributes !== undefined) {
        tracks.push({
          title: attributes.name,
          artist: attributes.artistName,
          album: attributes.albumName ?? null,
          isrc: attributes.isrc ?? null,
        });
      }
    }

    page =
      page.next === undefined || !page.next.startsWith('/v1/')
        ? null
        : readJsonAs(
            await valence.http.fetch(`${API}${page.next}`, { headers }),
            TracksSchema,
            'Apple Music',
          );
  }

  return { source: 'apple', id, name: playlist?.attributes.name ?? 'Apple Music playlist', tracks };
};

export { readApplePlaylist };
