import { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { readJsonAs } from '@Shared/readJsonAs';
import { askTrakt } from './askTrakt';
import type { TraktSession } from './TraktSession';
import type { TraktTitle, TraktWatch } from './TraktWatch';

const PAGE_SIZE = 100;

const IdsSchema = z.object({
  trakt: z.number(),
  imdb: z.string().nullish(),
  tmdb: z.number().nullish(),
});

const TitleSchema = z.object({ title: z.string(), year: z.number().nullish(), ids: IdsSchema });

const PageSchema = z.array(
  z.object({
    watched_at: z.string(),
    type: z.string(),
    movie: TitleSchema.optional(),
    show: TitleSchema.optional(),
    episode: z.object({ season: z.number(), number: z.number() }).optional(),
  }),
);

/**
 * A film or show as the rest of the plugin keeps it.
 *
 * @param title - It, as Trakt sends it.
 * @returns It, with its ids as strings.
 */
const asTitle = (title: z.infer<typeof TitleSchema>): TraktTitle => ({
  traktId: title.ids.trakt.toString(),
  title: title.title,
  year: title.year ?? null,
  tmdb: title.ids.tmdb === null || title.ids.tmdb === undefined ? null : title.ids.tmdb.toString(),
  imdb:
    title.ids.imdb === null || title.ids.imdb === undefined || title.ids.imdb === ''
      ? null
      : title.ids.imdb,
});

/**
 * Reads one page of somebody's Trakt history, newest first, between two times.
 *
 * @param valence - The host.
 * @param session - Their Trakt session.
 * @param page - Which page, from 1.
 * @param range - The plays to read: watched after `since` where given, and no later than `until`.
 * @returns The plays on the page, and how many pages there are where Trakt says.
 */
const readHistoryPage = async (
  valence: ValenceHost,
  session: TraktSession,
  page: number,
  range: { since: string | null; until: string },
): Promise<{ watches: TraktWatch[]; pages: number | null }> => {
  const query = [
    `page=${page.toString()}`,
    `limit=${PAGE_SIZE.toString()}`,
    `end_at=${encodeURIComponent(range.until)}`,
    ...(range.since === null ? [] : [`start_at=${encodeURIComponent(range.since)}`]),
  ].join('&');
  const answer = await askTrakt(valence, session, `/sync/history?${query}`);
  const items = readJsonAs(answer, PageSchema, 'Trakt');
  const pageCount = Object.entries(answer.headers).find(
    ([name]) => name.toLowerCase() === 'x-pagination-page-count',
  )?.[1];
  const pages = pageCount === undefined ? Number.NaN : Number.parseInt(pageCount, 10);

  return {
    watches: items.flatMap((item): TraktWatch[] => {
      if (item.type === 'movie' && item.movie !== undefined) {
        return [{ kind: 'film', watchedAt: item.watched_at, ...asTitle(item.movie) }];
      }

      if (item.type === 'episode' && item.show !== undefined && item.episode !== undefined) {
        return [
          {
            kind: 'episode',
            watchedAt: item.watched_at,
            show: asTitle(item.show),
            season: item.episode.season,
            number: item.episode.number,
          },
        ];
      }

      return [];
    }),
    pages: Number.isFinite(pages) ? pages : null,
  };
};

export { readHistoryPage };
