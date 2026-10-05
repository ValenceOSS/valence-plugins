import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { readMusicImportJob } from './readMusicImportJob';
import { readSpotifyPlaylists } from './readSpotifyPlaylists';

const MOST_MISSING_SHOWN = 30;

/**
 * The page somebody imports playlists from: their Spotify playlists where Spotify is connected, a
 * box for any Spotify or Apple Music playlist link, and how the last import went.
 *
 * @param context - The host and who is looking.
 * @param problem - Why the last thing they asked for could not be done, if it could not.
 * @returns The page.
 */
const renderImport = async (
  { valence, viewer }: SurfaceContext,
  problem: string | null = null,
): Promise<Surface> => {
  const spotify = await valence.accounts.connection(viewer.profileId, 'spotify');
  const settings = await valence.settings.read();
  const job = await readMusicImportJob(valence, viewer.profileId);
  const isBusy = job !== null && job.finishedAt === null;
  const playlists =
    spotify === null || isBusy ? [] : await readSpotifyPlaylists(valence, spotify.accessToken);
  const canConnect =
    typeof settings['spotifyClientId'] === 'string' && settings['spotifyClientId'] !== '';

  const status: SurfaceBlock[] =
    job === null
      ? []
      : isBusy
        ? [
            {
              type: 'progress',
              label: `Importing ${job.name}: ${job.next.toString()} of ${job.tracks.length.toString()} songs`,
              value: job.tracks.length === 0 ? 1 : job.next / job.tracks.length,
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
              title: `${job.name} imported`,
              text: `${job.found.toString()} of ${job.tracks.length.toString()} songs are in your library${
                job.requested.length === 0
                  ? '.'
                  : `, and ${job.requested.length.toString()} albums were requested.`
              }`,
            },
            ...(job.missing.length === 0
              ? []
              : [
                  {
                    type: 'list' as const,
                    title: 'Not in your library',
                    rows: job.missing
                      .slice(0, MOST_MISSING_SHOWN)
                      .map((song) => ({ type: 'row' as const, label: song })),
                  },
                ]),
          ];

  return {
    title: 'Import playlists',
    blocks: [
      ...(problem === null
        ? []
        : [{ type: 'notice' as const, tone: 'danger' as const, text: problem }]),
      ...status,
      ...(isBusy
        ? []
        : [
            {
              type: 'section' as const,
              title: 'From a link',
              children: [
                {
                  type: 'textField' as const,
                  field: 'link',
                  label: 'Spotify or Apple Music playlist link',
                  placeholder: 'https://open.spotify.com/playlist/…',
                },
                {
                  type: 'toggle' as const,
                  field: 'shouldRequest',
                  label: 'Request the albums of songs I do not have',
                  value: true,
                },
                {
                  type: 'button' as const,
                  label: 'Import',
                  action: { id: 'import-link' },
                  tone: 'primary' as const,
                  icon: 'download' as const,
                },
              ],
            },
            {
              type: 'section' as const,
              title: 'Your Spotify',
              children:
                spotify !== null
                  ? [
                      {
                        type: 'row' as const,
                        label: 'Spotify',
                        detail:
                          spotify.account === null
                            ? 'Connected'
                            : `Connected as ${spotify.account}`,
                        icon: 'check' as const,
                        action: {
                          id: 'valence.accounts.disconnect',
                          payload: { provider: 'spotify' },
                          confirm: 'Disconnect Spotify?',
                        },
                      },
                      {
                        type: 'list' as const,
                        title: 'Playlists',
                        rows: playlists.map((playlist) => ({
                          type: 'row' as const,
                          label: playlist.name,
                          detail: `${playlist.tracks.toString()} songs`,
                          icon: 'music' as const,
                          action: {
                            id: 'import-spotify',
                            payload: { playlist: playlist.id },
                            confirm: `Import ${playlist.name}?`,
                          },
                        })),
                      },
                    ]
                  : canConnect
                    ? [
                        {
                          type: 'button' as const,
                          label: 'Connect Spotify',
                          action: {
                            id: 'valence.accounts.connect',
                            payload: { provider: 'spotify' },
                          },
                          icon: 'link' as const,
                        },
                      ]
                    : [
                        {
                          type: 'text' as const,
                          text: 'An administrator can add Spotify’s client id in this plugin’s settings to let you connect your account.',
                          tone: 'muted' as const,
                        },
                      ],
            },
          ]),
    ],
  };
};

export { renderImport };
