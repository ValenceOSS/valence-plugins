import { z } from 'zod';
import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { seriesKeyFor } from './seriesKeyFor';

const MatchSchema = z.object({
  anilistId: z.string().nullable(),
  malId: z.string().nullable(),
  title: z.string(),
});

/**
 * A programme's panel: which anime it was matched to, with a way to open it on each list, or a
 * word that it has not been matched yet.
 *
 * @param context - The host and the programme being looked at.
 * @returns The panel.
 */
const renderSeriesPanel = async ({ valence, subject }: SurfaceContext): Promise<Surface> => {
  const match =
    subject === null
      ? null
      : MatchSchema.safeParse(await valence.storage.get(seriesKeyFor(subject.id)));

  if (match === null || !match.success) {
    return {
      blocks: [
        {
          type: 'text',
          text: 'Not matched to an anime yet. Importing your list from the Anime tracking page matches it.',
          tone: 'muted',
        },
      ],
    };
  }

  return {
    blocks: [
      { type: 'row', label: match.data.title, detail: 'Matched on your anime list', icon: 'tv' },
      ...(match.data.anilistId === null
        ? []
        : [
            {
              type: 'link' as const,
              label: 'Open on AniList',
              url: `https://anilist.co/anime/${match.data.anilistId}`,
            },
          ]),
      ...(match.data.malId === null
        ? []
        : [
            {
              type: 'link' as const,
              label: 'Open on MyAnimeList',
              url: `https://myanimelist.net/anime/${match.data.malId}`,
            },
          ]),
    ],
  };
};

export { renderSeriesPanel };
