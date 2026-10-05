import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { PLAYLIST_SOURCES } from './PLAYLIST_SOURCES';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import type { MadeFor } from './readListenBrainzPlaylist';
import { readPreferences } from './readPreferences';
import { readShouldRequest } from './readShouldRequest';
import { requestPendingAlbums } from './requestPendingAlbums';
import { sendScrobbles } from './sendScrobbles';
import { updatePlaylist } from './updatePlaylist';

/** How long one run keeps starting work, well inside the 30 seconds Valence gives each call. */
const BUDGET_MS = 20_000;

/** How soon in a run requesting a playlist's albums may start, since Valence may take 15 seconds
 * to find them. */
const REQUESTS_START_WITHIN_MS = 5_000;

/** When a run stops requesting albums, leaving the rest for the next. */
const REQUESTS_STOP_AFTER_MS = 26_000;

/**
 * The scheduled run, for each person with a service connected: sends the scrobbles that could not
 * be sent when they played, and keeps each playlist they chose in step with its service. Where the
 * administrator chose to, the albums of kept playlists' missing songs are requested, early in the
 * run, since Valence may take a while to find them.
 *
 * @param valence - The host.
 * @param now - The time now.
 * @param budgetMs - How long to keep starting work; the rest waits for the next run.
 * @returns How many playlists changed.
 */
const updateEveryone = async (
  valence: ValenceHost,
  now: Date = new Date(),
  budgetMs: number = BUDGET_MS,
): Promise<number> => {
  const startedAt = Date.now();
  const deadline = startedAt + budgetMs;
  const shouldRequest = await readShouldRequest(valence);
  const requestTimes = {
    startBy: startedAt + Math.min(REQUESTS_START_WITHIN_MS, budgetMs),
    stopBy: startedAt + REQUESTS_STOP_AFTER_MS,
  };

  if (shouldRequest) {
    await requestPendingAlbums(valence, requestTimes);
  }

  const keys = await readLastfmKeys(valence);
  const madeFor: MadeFor = new Map();
  let updated = 0;

  for (const profile of await valence.profiles.list()) {
    const links = await readLinks(valence, profile.id);

    if (Date.now() >= deadline || (links.listenbrainz === null && links.lastfm === null)) {
      continue;
    }

    await sendScrobbles(valence, profile.id).catch((failure: unknown) => {
      valence.log.warn('Could not send scrobbles for a profile', {
        profile: profile.id,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    });

    const { keep } = await readPreferences(valence, profile.id);

    for (const source of PLAYLIST_SOURCES.filter((each) => keep.includes(each.id))) {
      if (Date.now() >= deadline) {
        break;
      }

      try {
        const preferences = await readPreferences(valence, profile.id);
        const outcome = await updatePlaylist(
          valence,
          {
            profileId: profile.id,
            personName: profile.name,
            links,
            keys,
            preferences,
            shouldRequest,
            madeFor,
          },
          source,
          now,
          deadline,
        );

        updated += outcome === 'updated' ? 1 : 0;
      } catch (failure) {
        valence.log.warn('Could not update a playlist', {
          profile: profile.id,
          playlist: source.id,
          problem: failure instanceof Error ? failure.message : 'unknown',
        });
      }
    }
  }

  if (shouldRequest) {
    await requestPendingAlbums(valence, requestTimes);
  }

  return updated;
};

export { updateEveryone };
