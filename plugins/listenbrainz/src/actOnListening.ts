import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceActRequest } from '@ValenceSDK/surface/SurfaceActRequestSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { connectListenBrainz } from './connectListenBrainz';
import { finishLastfmSignIn } from './finishLastfmSignIn';
import { linkKeyFor } from './linkKeyFor';
import { PLAYLIST_SOURCES } from './PLAYLIST_SOURCES';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import { readPreferences } from './readPreferences';
import { readShouldRequest } from './readShouldRequest';
import { renderListening } from './renderListening';
import { startLastfmSignIn } from './startLastfmSignIn';
import { updatePlaylist } from './updatePlaylist';

/** How long saving spends making newly chosen playlists before the schedule finishes them. */
const FIRST_UPDATE_MS = 8000;

/**
 * Saves somebody's choices, and starts on each playlist they have just chosen to keep so it
 * appears soon rather than within the hour. A playlist whose service is not connected now keeps its
 * choice for when it is again.
 *
 * @param context - The host and who saved.
 * @param fields - The page's fields.
 * @param now - The time now.
 */
const save = async (
  { valence, viewer }: SurfaceContext,
  fields: SurfaceActRequest['fields'],
  now: Date,
): Promise<void> => {
  const { profileId } = viewer;
  const links = await readLinks(valence, profileId);
  const before = await readPreferences(valence, profileId);
  const offered = PLAYLIST_SOURCES.filter((source) => links[source.service] !== null);
  const preferences = {
    scrobble: fields['scrobble'] !== false,
    keep: [
      ...before.keep.filter((id) => !offered.some((source) => source.id === id)),
      ...offered.filter((source) => fields[source.field] === true).map((source) => source.id),
    ],
  };

  await valence.storage.set(`preferences:${profileId}`, preferences);

  const keys = await readLastfmKeys(valence);
  const deadline = Date.now() + FIRST_UPDATE_MS;
  const personName =
    (await valence.profiles.list()).find((profile) => profile.id === profileId)?.name ?? '';

  for (const source of offered.filter(
    (each) => preferences.keep.includes(each.id) && !before.keep.includes(each.id),
  )) {
    await updatePlaylist(
      valence,
      {
        profileId,
        personName,
        links,
        keys,
        preferences,
        shouldRequest: await readShouldRequest(valence),
        madeFor: new Map(),
      },
      source,
      now,
      deadline,
    );
  }
};

/**
 * Does what somebody pressed on the page, then shows it again, with a sentence where it could not
 * be done.
 *
 * @param context - The host and who pressed it.
 * @param request - What they pressed, and the page's fields.
 * @param now - The time now.
 * @returns The page as it now stands.
 */
const actOnListening = async (
  context: SurfaceContext,
  request: SurfaceActRequest,
  now: Date = new Date(),
): Promise<Surface> => {
  const { valence, viewer } = context;
  const { profileId } = viewer;
  const keys = await readLastfmKeys(valence);
  let problem: string | null = null;

  try {
    switch (request.action.id) {
      case 'connect-listenbrainz': {
        const token = request.fields['listenbrainzToken'];

        problem = await connectListenBrainz(
          valence,
          profileId,
          typeof token === 'string' ? token : '',
        );

        break;
      }
      case 'disconnect-listenbrainz': {
        await valence.storage.delete(linkKeyFor('listenbrainz', profileId));

        break;
      }
      case 'connect-lastfm': {
        if (keys !== null) {
          await startLastfmSignIn(valence, keys, profileId, now);
        }

        break;
      }
      case 'finish-lastfm': {
        problem = keys === null ? null : await finishLastfmSignIn(valence, keys, profileId, now);

        break;
      }
      case 'disconnect-lastfm': {
        await valence.storage.delete(linkKeyFor('lastfm', profileId));

        break;
      }
      case 'save': {
        await save(context, request.fields, now);

        break;
      }
      default:
    }
  } catch (failure) {
    valence.log.warn('Could not reach ListenBrainz or Last.fm', {
      action: request.action.id,
      problem: failure instanceof Error ? failure.message : 'unknown',
    });
    problem =
      request.action.id === 'save'
        ? 'Saved. A playlist could not be read just now, and is tried again within the hour.'
        : 'ListenBrainz or Last.fm could not be reached. Try again in a moment.';
  }

  return renderListening(context, problem, now);
};

export { actOnListening };
