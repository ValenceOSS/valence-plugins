import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';
import { playlistOf } from './playlistOf';
import { songsOf } from './songsOf';

const MOST_ADDED = 500;

/**
 * Making, changing and removing the person's own playlists from an app. Positions an app gives are
 * those of the songs it was shown, which leave out songs the playlist lists that Valence doesn't
 * have. A playlist that fills itself from its rules can be renamed or removed, but not filled by
 * hand.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @param endpoint - Which change it is.
 * @returns The answer.
 */
const answerPlaylistChanges = async (
  { valence, person, asked, ok, failed }: Answering,
  endpoint: 'createPlaylist' | 'updatePlaylist' | 'deletePlaylist',
): Promise<SubsonicReply> => {
  const { profileId } = person;

  try {
    const dropAll = async (playlistId: string, entryIds: readonly string[]) => {
      for (let at = 0; at < entryIds.length; at += MOST_ADDED) {
        await valence.playlists.dropMany(
          profileId,
          playlistId,
          entryIds.slice(at, at + MOST_ADDED),
        );
      }
    };

    if (endpoint === 'deletePlaylist') {
      const id = asked.text('id');

      if (id === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say which playlist with id.');
      }

      await valence.playlists.remove(profileId, id);

      return ok();
    }

    if (endpoint === 'createPlaylist') {
      const existing = asked.text('playlistId');
      const name = asked.text('name');
      const songs = asked.texts('songId');

      if (existing === null && name === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say what to call it with name.');
      }

      const id = existing ?? (await valence.playlists.create(profileId, { name: name ?? '' })).id;

      if (existing !== null) {
        const read = await valence.playlists.read(profileId, existing);

        if (read === null) {
          return failed(SUBSONIC_ERROR.notFound, 'There is no such playlist.');
        }

        await dropAll(
          existing,
          read.entries.flatMap((entry) => (entry.mediaId === null ? [] : [entry.entryId])),
        );

        if (name !== null) {
          await valence.playlists.rename(profileId, existing, { name });
        }
      }

      for (let at = 0; at < songs.length; at += MOST_ADDED) {
        await valence.playlists.add(profileId, id, songs.slice(at, at + MOST_ADDED));
      }

      const made = await valence.playlists.read(profileId, id);

      return made === null ? ok() : ok({ playlist: await playlistOf(valence, person, made) });
    }

    const id = asked.text('playlistId');
    const read = id === null ? null : await valence.playlists.read(profileId, id);

    if (id === null) {
      return failed(SUBSONIC_ERROR.missing, 'Say which playlist with playlistId.');
    }

    if (read === null) {
      return failed(SUBSONIC_ERROR.notFound, 'There is no such playlist.');
    }

    const name = asked.text('name');
    const comment = asked.text('comment');

    if (name !== null || comment !== null) {
      await valence.playlists.rename(profileId, id, {
        name: name ?? read.name,
        ...(comment === null ? {} : { description: comment }),
      });
    }

    const shown = new Set(
      (
        await songsOf(
          valence,
          profileId,
          read.entries.flatMap((entry) => (entry.mediaId === null ? [] : [entry.mediaId])),
          false,
        )
      ).map((song) => song['id']),
    );
    const playable = read.entries.filter(
      (entry) => entry.mediaId !== null && shown.has(entry.mediaId),
    );
    const removed = new Set(asked.texts('songIndexToRemove').map(Number));

    for (let at = 0; at < playable.length; at += MOST_ADDED) {
      const dropped = playable
        .slice(at, at + MOST_ADDED)
        .flatMap((entry, within) => (removed.has(at + within) ? [entry.entryId] : []));

      if (dropped.length > 0) {
        await valence.playlists.dropMany(profileId, id, dropped);
      }
    }

    const added = asked.texts('songIdToAdd');

    for (let at = 0; at < added.length; at += MOST_ADDED) {
      await valence.playlists.add(profileId, id, added.slice(at, at + MOST_ADDED));
    }

    return ok();
  } catch {
    return failed(SUBSONIC_ERROR.notFound, 'That playlist can’t be changed.');
  }
};

export { answerPlaylistChanges };
