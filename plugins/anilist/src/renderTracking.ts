import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import { connectedLists } from './connectedLists';
import { PROVIDERS } from './PROVIDERS';
import { readImportJob } from './readImportJob';
import { readPreferences } from './readPreferences';

const MOST_UNMATCHED_SHOWN = 25;

/**
 * The page somebody manages their anime lists from: which lists are connected, whether progress is
 * passed back, and how their import went, with the shows that could not be found.
 *
 * @param context - The host and who is looking.
 * @returns The page.
 */
const renderTracking = async ({ valence, viewer }: SurfaceContext): Promise<Surface> => {
  const settings = await valence.settings.read();
  const connected = await connectedLists(valence, viewer.profileId);
  const preferences = await readPreferences(valence, viewer.profileId);
  const job = await readImportJob(valence, viewer.profileId);

  const lists: SurfaceBlock[] = PROVIDERS.map((provider) => {
    const connection = connected.find((each) => each.provider === provider.id);
    const isReady =
      typeof settings[provider.clientIdSetting] === 'string' &&
      settings[provider.clientIdSetting] !== '';

    if (connection !== undefined) {
      return {
        type: 'row',
        label: provider.name,
        detail: connection.account === null ? 'Connected' : `Connected as ${connection.account}`,
        icon: 'check',
        action: {
          id: 'valence.accounts.disconnect',
          payload: { provider: provider.id },
          confirm: `Disconnect ${provider.name}?`,
        },
      };
    }

    return isReady
      ? {
          type: 'button',
          label: `Connect ${provider.name}`,
          action: { id: 'valence.accounts.connect', payload: { provider: provider.id } },
          icon: 'link',
        }
      : {
          type: 'notice',
          tone: 'info',
          title: provider.name,
          text: `An administrator needs to add ${provider.name}'s client id in this plugin's settings before it can be connected.`,
        };
  });

  const progress: SurfaceBlock[] =
    job === null
      ? []
      : job.finishedAt === null
        ? [
            {
              type: 'progress',
              label: `Importing: ${job.next.toString()} of ${job.entries.length.toString()} shows`,
              value: job.entries.length === 0 ? 1 : job.next / job.entries.length,
            },
            {
              type: 'button',
              label: 'Carry on importing',
              action: { id: 'continue' },
              icon: 'refresh',
            },
          ]
        : [
            {
              type: 'notice',
              tone: 'success',
              title: 'Imported',
              text: `Matched ${job.matched.toString()} of ${job.entries.length.toString()} shows and marked ${job.marked.toString()} episodes watched.`,
            },
            ...(job.unmatched.length === 0
              ? []
              : [
                  {
                    type: 'list' as const,
                    title: 'Not found in your library',
                    rows: job.unmatched
                      .slice(0, MOST_UNMATCHED_SHOWN)
                      .map((title) => ({ type: 'row' as const, label: title })),
                  },
                ]),
          ];

  return {
    title: 'Anime tracking',
    blocks: [
      {
        type: 'text',
        text: 'Connect AniList or MyAnimeList to mark what you have already watched, and to keep your list up to date as you watch here.',
        tone: 'muted',
      },
      { type: 'section', title: 'Your lists', children: lists },
      {
        type: 'section',
        title: 'Keeping up to date',
        children: [
          {
            type: 'toggle',
            field: 'twoWay',
            label: 'Update my lists when I finish an episode',
            value: preferences.twoWay,
          },
          { type: 'button', label: 'Save', action: { id: 'save' }, tone: 'secondary' },
        ],
      },
      ...(connected.length === 0
        ? []
        : [
            {
              type: 'section' as const,
              title: 'Import',
              children: [
                ...(job === null || job.finishedAt !== null
                  ? [
                      {
                        type: 'button' as const,
                        label: 'Import my lists',
                        action: { id: 'import' },
                        tone: 'primary' as const,
                        icon: 'download' as const,
                      },
                    ]
                  : []),
                ...progress,
              ],
            },
          ]),
    ],
  };
};

export { renderTracking };
