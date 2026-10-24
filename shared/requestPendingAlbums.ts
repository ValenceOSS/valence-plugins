import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { cutTo } from './cutTo';
import { PENDING_REQUESTS } from './PENDING_REQUESTS';
import { PendingRequestSchema } from './PendingRequest';

/**
 * Requests the albums of playlists' missing songs, for the person each playlist belongs to. Valence
 * finds the albums — only exact matches — and each one not in the library or asked for already is
 * requested, by the person's own request permissions and approval rules. A playlist Valence is
 * still matching, or one left over when the run's time is up, is picked up again on the next run,
 * and nothing already requested is asked for twice. A playlist whose albums couldn't be asked for
 * just now, because the requests service didn't answer, is kept for the next run without holding up
 * the others. The person is told how many albums were requested.
 *
 * @param valence - The host.
 * @param times - When to stop starting another playlist, and when to stop requesting altogether,
 *   as `Date.now()` times.
 * @returns How many albums were requested.
 */
const requestPendingAlbums = async (
  valence: ValenceHost,
  times: { startBy: number; stopBy: number },
): Promise<number> => {
  let requested = 0;

  for (const key of await valence.storage.keys(PENDING_REQUESTS)) {
    if (Date.now() >= times.startBy) {
      break;
    }

    const pending = PendingRequestSchema.safeParse(await valence.storage.get(key));
    const profileId = key.slice(PENDING_REQUESTS.length).split(':')[0] ?? '';

    if (!pending.success || profileId === '') {
      await valence.storage.delete(key);

      continue;
    }

    let made = 0;

    try {
      const found = await valence.requests.missingAlbums(profileId, pending.data.playlistId);

      if (found === null) {
        await valence.storage.delete(key);

        continue;
      }

      let isCut = false;

      for (const album of found.albums.filter((each) => !each.isInLibrary && !each.isRequested)) {
        if (Date.now() >= times.stopBy) {
          isCut = true;

          break;
        }

        const asked = await valence.requests.create(profileId, {
          catalogueId: album.catalogueId,
          kind: 'album',
        });

        made += asked.status === 'made' ? 1 : 0;
      }

      if (!found.isMatching && !isCut) {
        await valence.storage.delete(key);
      }
    } catch (failure) {
      valence.log.warn('Could not request the albums of a playlist just now', {
        profile: profileId,
        playlist: pending.data.playlistId,
        problem: failure instanceof Error ? failure.message : 'unknown',
      });
    }

    requested += made;

    if (made > 0) {
      await valence.notifications.send(profileId, {
        title: cutTo(`Albums requested for ${pending.data.name}`, 100),
        body: `${made.toString()} ${made === 1 ? 'album was' : 'albums were'} requested for the songs not in your library.`,
      });
    }
  }

  return requested;
};

export { requestPendingAlbums };
