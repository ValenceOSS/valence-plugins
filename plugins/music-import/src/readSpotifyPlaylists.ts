import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';

const MOST_PAGES = 10;

const MeSchema = z.object({ id: z.string() });

const PageSchema = z.object({
  items: z.array(
    z
      .object({
        id: z.string(),
        name: z.string(),
        collaborative: z.boolean().optional(),
        owner: z.object({ id: z.string() }).nullable().optional(),
        items: z.object({ total: z.number() }).nullable().optional(),
      })
      .nullable(),
  ),
  next: z.string().nullable().optional(),
});

/**
 * The playlists in a connected Spotify account that Spotify will share the songs of: the ones the
 * person made or collaborates on, across every page.
 *
 * @param valence - The host.
 * @param token - The viewer's Spotify token.
 * @returns Each playlist's id, name and length.
 */
const readSpotifyPlaylists = async (
  valence: ValenceHost,
  token: string,
): Promise<{ id: string; name: string; tracks: number }[]> => {
  const headers = { authorization: `Bearer ${token}` };
  const me = readJsonAs(
    await valence.http.fetch('https://api.spotify.com/v1/me', { headers }),
    MeSchema,
    'Spotify',
  );
  const playlists: { id: string; name: string; tracks: number }[] = [];
  let next: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';

  for (let read = 0; next !== null && read < MOST_PAGES; read += 1) {
    const page: z.infer<typeof PageSchema> = readJsonAs(
      await valence.http.fetch(next, { headers }),
      PageSchema,
      'Spotify',
    );

    for (const item of page.items) {
      if (item !== null && (item.owner?.id === me.id || item.collaborative === true)) {
        playlists.push({ id: item.id, name: item.name, tracks: item.items?.total ?? 0 });
      }
    }

    next = page.next ?? null;
  }

  return playlists;
};

export { readSpotifyPlaylists };
