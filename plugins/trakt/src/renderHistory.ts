import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { accountKeyFor } from './accountKeyFor';
import type { HistoryJob } from './HistoryJob';
import { readHistoryJob } from './readHistoryJob';
import { rememberAccount } from './rememberAccount';
import { readPreferences } from './readPreferences';

const MOST_UNMATCHED_SHOWN = 25;

/**
 * How an import stands: how far it has got with a way to carry on, or how it went, with the films
 * and shows the library does not have.
 *
 * @param job - The import.
 * @returns The blocks that show it.
 */
const importBlocks = (job: HistoryJob): SurfaceBlock[] => {
  if (job.finishedAt === null) {
    return [
      {
        type: 'progress',
        label:
          job.pages === null
            ? 'Importing'
            : `Importing: page ${Math.min(job.page, job.pages).toString()} of ${job.pages.toString()}`,
        value: job.pages === null || job.pages === 0 ? 0 : Math.min(1, (job.page - 1) / job.pages),
      },
      { type: 'button', label: 'Carry on importing', action: { id: 'continue' }, icon: 'refresh' },
    ];
  }

  return [
    {
      type: 'notice',
      tone: 'success',
      title: 'Imported',
      text: `Found ${job.matched.toString()} of ${job.plays.toString()} plays in your library and marked ${job.marked.toString()} watched.`,
    },
    ...(job.unmatched.length === 0
      ? []
      : [
          {
            type: 'list' as const,
            title: 'Not in your library',
            rows: job.unmatched
              .slice(0, MOST_UNMATCHED_SHOWN)
              .map((title) => ({ type: 'row' as const, label: title })),
          },
        ]),
  ];
};

/**
 * The page somebody connects Trakt from: their account, whether what they finish is sent to
 * Trakt, and how their import went.
 *
 * @param context - The host and who is looking.
 * @param problem - Why the last thing they asked for could not be done, if it could not.
 * @returns The page.
 */
const renderHistory = async (
  { valence, viewer }: SurfaceContext,
  problem: string | null = null,
): Promise<Surface> => {
  const settings = await valence.settings.read();
  const connection = await valence.accounts.connection(viewer.profileId, 'trakt');
  const account =
    (await valence.storage.get(accountKeyFor(viewer.profileId))) ??
    (connection === null
      ? null
      : await rememberAccount(valence, viewer.profileId).catch(() => null));
  const preferences = await readPreferences(valence, viewer.profileId);
  const job = await readHistoryJob(valence, 'import', viewer.profileId);
  const isReady = typeof settings['traktClientId'] === 'string' && settings['traktClientId'] !== '';

  const accountBlock: SurfaceBlock =
    connection !== null
      ? {
          type: 'row',
          label: 'Trakt',
          detail: typeof account === 'string' ? `Connected as ${account}` : 'Connected',
          icon: 'check',
          action: {
            id: 'valence.accounts.disconnect',
            payload: { provider: 'trakt' },
            confirm: 'Disconnect Trakt? Your history in Valence stays as it is.',
          },
        }
      : isReady
        ? {
            type: 'button',
            label: 'Connect Trakt',
            action: { id: 'valence.accounts.connect', payload: { provider: 'trakt' } },
            icon: 'link',
          }
        : {
            type: 'notice',
            tone: 'info',
            title: 'Trakt',
            text: "An administrator needs to add Trakt's client id in this plugin's settings before it can be connected.",
          };

  return {
    title: 'Trakt',
    blocks: [
      ...(problem === null
        ? []
        : [{ type: 'notice' as const, tone: 'danger' as const, text: problem }]),
      {
        type: 'text',
        text: 'Connect Trakt to mark what you have watched there as watched here, and to add what you finish here to your Trakt history.',
        tone: 'muted',
      },
      { type: 'section', title: 'Your account', children: [accountBlock] },
      {
        type: 'section',
        title: 'Keeping up to date',
        children: [
          {
            type: 'toggle',
            field: 'twoWay',
            label: 'Send what I finish to Trakt',
            value: preferences.twoWay,
          },
          { type: 'button', label: 'Save', action: { id: 'save' }, tone: 'secondary' },
        ],
      },
      ...(connection === null
        ? []
        : [
            {
              type: 'section' as const,
              title: 'Import',
              children: [
                {
                  type: 'text' as const,
                  text: 'Plays added on Trakt are checked for once a day. Importing again also finds plays added on Trakt with an earlier date.',
                  tone: 'muted' as const,
                },
                ...(job === null || job.finishedAt !== null
                  ? [
                      {
                        type: 'button' as const,
                        label: job === null ? 'Import my history' : 'Import again',
                        action: { id: 'import' },
                        tone: 'primary' as const,
                        icon: 'download' as const,
                      },
                    ]
                  : []),
                ...(job === null ? [] : importBlocks(job)),
              ],
            },
          ]),
    ],
  };
};

export { renderHistory };
