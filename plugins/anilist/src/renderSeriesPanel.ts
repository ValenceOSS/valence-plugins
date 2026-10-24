import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { shownAs } from '@Shared/shownAs';
import { linkKeyFor } from './linkKeyFor';
import { SeriesLinkSchema } from './SeriesLink';

/**
 * A programme's panel for the person looking: which entries on their lists it was matched to, one
 * per season the lists count, with a way to open each, or a word that their import hasn't matched
 * it yet. Nobody sees another person's list.
 *
 * @param context - The host, who is looking, and the programme.
 * @returns The panel.
 */
const renderSeriesPanel = async ({
  valence,
  viewer,
  subject,
}: SurfaceContext): Promise<Surface> => {
  const link =
    subject === null
      ? null
      : SeriesLinkSchema.safeParse(
          await valence.storage.get(linkKeyFor(viewer.profileId, subject.id)),
        );

  if (link === null || !link.success || link.data.entries.length === 0) {
    return {
      blocks: [
        {
          type: 'text',
          text: 'Not matched to your anime list yet. Importing your list from the Anime tracking page matches it.',
          tone: 'muted',
        },
      ],
    };
  }

  return {
    blocks: link.data.entries.flatMap((entry): SurfaceBlock[] => [
      {
        type: 'row',
        label: shownAs(entry.title, 120),
        detail:
          link.data.entries.length === 1
            ? 'Matched on your anime list'
            : entry.episodes === null
              ? `From episode ${(entry.offset + 1).toString()}`
              : `Episodes ${(entry.offset + 1).toString()} to ${(entry.offset + entry.episodes).toString()}`,
        icon: 'tv',
      },
      ...(entry.anilistId === null
        ? []
        : [
            {
              type: 'link' as const,
              label: 'Open on AniList',
              url: `https://anilist.co/anime/${entry.anilistId}`,
            },
          ]),
      ...(entry.malId === null
        ? []
        : [
            {
              type: 'link' as const,
              label: 'Open on MyAnimeList',
              url: `https://myanimelist.net/anime/${entry.malId}`,
            },
          ]),
    ]),
  };
};

export { renderSeriesPanel };
