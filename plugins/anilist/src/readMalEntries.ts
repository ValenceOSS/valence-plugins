import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import type { AnimeEntry } from './AnimeEntry';

const FIRST_PAGE =
  'https://api.myanimelist.net/v2/users/@me/animelist?fields=list_status,num_episodes,start_season,alternative_titles&limit=1000&nsfw=true';

const MOST_PAGES = 10;

const STATUSES = {
  watching: 'watching',
  completed: 'completed',
  plan_to_watch: 'planning',
  on_hold: 'paused',
  dropped: 'dropped',
} as const;

const PageSchema = z.object({
  data: z.array(
    z.object({
      node: z.object({
        id: z.number(),
        title: z.string(),
        num_episodes: z.number().optional(),
        start_season: z.object({ year: z.number() }).optional(),
        alternative_titles: z
          .object({ en: z.string().optional(), synonyms: z.array(z.string()).optional() })
          .optional(),
      }),
      list_status: z.object({
        status: z.enum(['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']),
        num_episodes_watched: z.number(),
        is_rewatching: z.boolean().optional(),
      }),
    }),
  ),
  paging: z.object({ next: z.string().optional() }).optional(),
});

/**
 * Reads everything on somebody's MyAnimeList anime list, following its pages.
 *
 * @param valence - The host.
 * @param token - Their MyAnimeList token.
 * @returns Each entry, with the ids and titles that find it in a library.
 */
const readMalEntries = async (valence: ValenceHost, token: string): Promise<AnimeEntry[]> => {
  const entries: AnimeEntry[] = [];
  let next: string | undefined = FIRST_PAGE;

  for (let page = 0; next !== undefined && page < MOST_PAGES; page += 1) {
    const answer: z.infer<typeof PageSchema> = readJsonAs(
      await valence.http.fetch(next, { headers: { authorization: `Bearer ${token}` } }),
      PageSchema,
      'MyAnimeList',
    );

    for (const { node, list_status: status } of answer.data) {
      entries.push({
        provider: 'mal',
        id: node.id.toString(),
        anilistId: null,
        malId: node.id.toString(),
        titles: [
          node.alternative_titles?.en ?? '',
          node.title,
          ...(node.alternative_titles?.synonyms ?? []),
        ].filter((title) => title !== ''),
        year: node.start_season?.year ?? null,
        progress: status.num_episodes_watched,
        episodes:
          node.num_episodes === undefined || node.num_episodes === 0 ? null : node.num_episodes,
        status: status.is_rewatching === true ? 'repeating' : STATUSES[status.status],
      });
    }

    next = answer.paging?.next;
  }

  return entries;
};

export { readMalEntries };
