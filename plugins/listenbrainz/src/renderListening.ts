import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceBlock } from '@ValenceSDK/surface/SurfaceBlockSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { lastfmAllowUrlFor } from './lastfmAllowUrlFor';
import type { LastfmKeys } from './LastfmKeys';
import type { LastfmLink, ListenBrainzLink } from './Links';
import { PLAYLIST_SOURCES } from './PLAYLIST_SOURCES';
import { playlistKeysFor } from './playlistKeysFor';
import { readKeptPlaylist } from './readKeptPlaylist';
import { readLastfmKeys } from './readLastfmKeys';
import { readLastfmSignIn } from './readLastfmSignIn';
import { readLinks } from './readLinks';
import { readPreferences } from './readPreferences';
import { SERVICE_NAMES } from './SERVICE_NAMES';

/**
 * How somebody connects ListenBrainz, or the account they connected.
 *
 * @param link - Their connection, where they have one.
 * @returns The section's blocks.
 */
const listenBrainzBlocks = (link: ListenBrainzLink | null): SurfaceBlock[] =>
  link !== null
    ? [
        {
          type: 'row',
          label: 'ListenBrainz',
          detail: `Connected as ${link.user}`,
          icon: 'check',
          action: {
            id: 'disconnect-listenbrainz',
            confirm: 'Disconnect ListenBrainz? Your playlists stay, but stop updating.',
          },
        },
      ]
    : [
        {
          type: 'textField',
          field: 'listenbrainzToken',
          label: 'User token',
          isSecret: true,
        },
        { type: 'link', label: 'Find your user token', url: 'https://listenbrainz.org/settings/' },
        {
          type: 'button',
          label: 'Connect ListenBrainz',
          action: { id: 'connect-listenbrainz' },
          icon: 'link',
        },
      ];

/**
 * How somebody connects Last.fm, where they are in signing in, or the account they connected.
 *
 * @param keys - The plugin's Last.fm keys, where an administrator has added them.
 * @param link - Their connection, where they have one.
 * @param signInToken - The token of a sign-in under way, where there is one.
 * @returns The section's blocks.
 */
const lastfmBlocks = (
  keys: LastfmKeys | null,
  link: LastfmLink | null,
  signInToken: string | null,
): SurfaceBlock[] => {
  if (link !== null) {
    return [
      {
        type: 'row',
        label: 'Last.fm',
        detail: `Connected as ${link.user}`,
        icon: 'check',
        action: {
          id: 'disconnect-lastfm',
          confirm: 'Disconnect Last.fm? Your playlists stay, but stop updating.',
        },
      },
    ];
  }

  if (keys === null) {
    return [
      {
        type: 'notice',
        tone: 'info',
        text: "An administrator needs to add a Last.fm API key and shared secret in this plugin's settings before it can be connected.",
      },
    ];
  }

  if (signInToken !== null) {
    return [
      {
        type: 'text',
        text: 'Allow Valence on Last.fm, then come back here and finish connecting.',
      },
      { type: 'link', label: 'Allow on Last.fm', url: lastfmAllowUrlFor(keys.apiKey, signInToken) },
      {
        type: 'button',
        label: 'Finish connecting',
        action: { id: 'finish-lastfm' },
        tone: 'primary',
        icon: 'check',
      },
    ];
  }

  return [
    { type: 'button', label: 'Connect Last.fm', action: { id: 'connect-lastfm' }, icon: 'link' },
  ];
};

/**
 * The page somebody connects ListenBrainz and Last.fm from: their accounts, whether what they play
 * is scrobbled, and which of the services' playlists are kept as Valence playlists, with how each
 * stands.
 *
 * @param context - The host and who is looking.
 * @param problem - Why the last thing they asked for could not be done, if it could not.
 * @param now - The time now.
 * @returns The page.
 */
const renderListening = async (
  { valence, viewer }: SurfaceContext,
  problem: string | null = null,
  now: Date = new Date(),
): Promise<Surface> => {
  const { profileId } = viewer;
  const links = await readLinks(valence, profileId);
  const keys = await readLastfmKeys(valence);
  const signIn = await readLastfmSignIn(valence, profileId, now);
  const preferences = await readPreferences(valence, profileId);
  const offered = PLAYLIST_SOURCES.filter((source) => links[source.service] !== null);
  const statuses = await Promise.all(
    offered
      .filter((source) => preferences.keep.includes(source.id))
      .map(async (source): Promise<SurfaceBlock & { type: 'row' }> => {
        const kept = await readKeptPlaylist(valence, profileId, source.id);
        const isUpdating =
          (await valence.storage.get(playlistKeysFor(profileId, source.id).update)) !== null;

        return {
          type: 'row',
          label: source.name,
          detail: isUpdating
            ? 'Updating'
            : kept === null
              ? 'Waiting for its first update'
              : `${kept.found.toString()} of ${kept.total.toString()} songs in your library`,
          icon: 'music',
        };
      }),
  );

  return {
    title: 'ListenBrainz and Last.fm',
    blocks: [
      ...(problem === null
        ? []
        : [{ type: 'notice' as const, tone: 'danger' as const, text: problem }]),
      {
        type: 'text',
        text: 'Connect ListenBrainz or Last.fm to scrobble what you play here, and to keep their playlists for you as Valence playlists.',
        tone: 'muted',
      },
      { type: 'section', title: 'ListenBrainz', children: listenBrainzBlocks(links.listenbrainz) },
      {
        type: 'section',
        title: 'Last.fm',
        children: lastfmBlocks(keys, links.lastfm, signIn?.token ?? null),
      },
      ...(offered.length === 0
        ? []
        : [
            {
              type: 'section' as const,
              title: 'Scrobbling',
              children: [
                {
                  type: 'toggle' as const,
                  field: 'scrobble',
                  label: 'Scrobble songs I play',
                  value: preferences.scrobble,
                  help: `Sends each song you finish to ${[
                    ...(links.listenbrainz === null ? [] : [SERVICE_NAMES.listenbrainz]),
                    ...(links.lastfm === null ? [] : [SERVICE_NAMES.lastfm]),
                  ].join(' and ')}.`,
                },
              ],
            },
            {
              type: 'section' as const,
              title: 'Playlists',
              children: [
                ...offered.map((source) => ({
                  type: 'toggle' as const,
                  field: source.field,
                  label: source.name,
                  value: preferences.keep.includes(source.id),
                  help: source.help,
                })),
                ...(statuses.length === 0
                  ? []
                  : [{ type: 'list' as const, title: 'Kept playlists', rows: statuses }]),
                {
                  type: 'text' as const,
                  text: 'Turning a playlist off stops updating it. The playlist itself stays.',
                  tone: 'muted' as const,
                },
              ],
            },
            {
              type: 'button' as const,
              label: 'Save',
              action: { id: 'save' },
              tone: 'primary' as const,
            },
          ]),
    ],
  };
};

export { renderListening };
