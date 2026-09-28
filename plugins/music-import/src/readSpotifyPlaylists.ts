import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';

const PageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      tracks: z.object({ total: z.number() }).nullable(),
    }),
  ),
});

/**
 * The playlists in a connected Spotify account.
 *
 * @param valence - The host.
 * @param token - The viewer's Spotify token.
 * @returns Each playlist's id, name and length.
 */
const readSpotifyPlaylists = async (
  valence: ValenceHost,
  token: string,
): Promise<{ id: string; name: string; tracks: number }[]> =>
  readJsonAs(
    await valence.http.fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { authorization: `Bearer ${token}` },
    }),
    PageSchema,
    'Spotify',
  ).items.map((item) => ({ id: item.id, name: item.name, tracks: item.tracks?.total ?? 0 }));

export { readSpotifyPlaylists };
