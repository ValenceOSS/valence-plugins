import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { pendingRequestKeyFor } from '@Shared/pendingRequestKeyFor';
import { shownAs } from '@Shared/shownAs';
import { readMusicImportJob } from './readMusicImportJob';
import { readSpotifyPlaylists } from './readSpotifyPlaylists';
import { totalOf } from './totalOf';

const MOST_MISSING_SHOWN = 30;

const MOST_PLAYLISTS_SHOWN = 200;

const LABEL = 120;

/**
 * The page somebody imports playlists from: the Spotify playlists they made or collaborate on where
 * Spotify is connected, a box for a playlist link, and how the last import went. Where Spotify
 * cannot be reached, the page still shows, saying so.
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
    spotify === null || isBusy
      ? []
      : await readSpotifyPlaylists(valence, spotify.accessToken).catch((failure: unknown) => {
          valence.log.warn('Spotify playlists could not be listed', {
            problem: failure instanceof Error ? failure.message : 'unknown',
          });

          return null;
        });
  const isRequesting =
    job !== null &&
    job.finishedAt !== null &&
    (await valence.storage.get(pendingRequestKeyFor(viewer.profileId, job.playlistId))) !== null;
  const canConnect =
    typeof settings['spotifyClientId'] === 'string' && settings['spotifyClientId'] !== '';

  const status: SurfaceBlock[] =
    job === null
      ? []
      : isBusy
        ? [
            {
              type: 'progress',
              label: shownAs(
                `Importing ${job.name}: ${job.next.toString()} of ${job.tracks.length.toString()} songs`,
                LABEL,
              ),
              value: job.tracks.length === 0 ? 1 : job.next / job.tracks.length,
            },
            {
              type: 'button',
              label: 'Carry on importing',
              action: { id: 'continue' },
              icon: 'refresh',
            },
            {
              type: 'button',
              label: 'Stop importing',
              action: {
                id: 'stop',
                confirm: 'Stop importing? The songs added so far stay in the playlist.',
              },
              tone: 'danger',
            },
          ]
        : [
            {
              type: 'notice',
              tone: 'success',
              title: shownAs(
                `${job.name} ${job.isStopped ? 'stopped importing' : 'imported'}`,
                LABEL,
              ),
              text: shownAs(
                `${job.found.toString()} of ${totalOf(job).toString()} songs are in your library.${
                  isRequesting ? ' The albums Valence finds for the rest are being requested.' : ''
                }${job.isCut ? ' The playlist was too long to read all of it.' : ''}`,
                2000,
              ),
            },
            ...(job.missing.length === 0
              ? []
              : [
                  {
                    type: 'list' as const,
                    title: 'Not in your library',
                    rows: job.missing
                      .slice(0, MOST_MISSING_SHOWN)
                      .map((song) => ({ type: 'row' as const, label: shownAs(song, LABEL) })),
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
                  label: 'Playlist link',
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
                            : shownAs(`Connected as ${spotify.account}`, LABEL),
                        icon: 'check' as const,
                        action: {
                          id: 'valence.accounts.disconnect',
                          payload: { provider: 'spotify' },
                          confirm: 'Disconnect Spotify?',
                        },
                      },
                      playlists === null
                        ? {
                            type: 'notice' as const,
                            tone: 'warning' as const,
                            text: 'Your Spotify playlists could not be listed. Try again in a moment.',
                          }
                        : {
                            type: 'list' as const,
                            title: 'Playlists you made or collaborate on',
                            rows: playlists.slice(0, MOST_PLAYLISTS_SHOWN).map((playlist) => ({
                              type: 'row' as const,
                              label: shownAs(playlist.name, LABEL),
                              detail: `${playlist.tracks.toString()} songs`,
                              icon: 'music' as const,
                              action: {
                                id: 'import-spotify',
                                payload: { playlist: playlist.id },
                                confirm: shownAs(`Import ${playlist.name}?`, 200),
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
