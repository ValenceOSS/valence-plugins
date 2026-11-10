import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';
import { artistOf } from './artistOf';
import { songsOf } from './songsOf';
import { EPOCH } from './EPOCH';

const MOST_STARRED = 2000;

/**
 * Stars and ratings: starring and unstarring songs, albums and artists, rating songs from 0 (no
 * stars) to 5, and listing what the person starred. A batch stars every item it can, and fails
 * only when none could be. A starred song is a liked song in Valence and a starred artist one they
 * follow. Valence keeps no liked albums yet, so starring one is answered without being kept, and
 * nothing is lost once it does.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @param endpoint - Which of these it is.
 * @returns The answer.
 */
const answerStars = async (
  { valence, person, asked, ok, failed }: Answering,
  endpoint: 'star' | 'unstar' | 'setRating' | 'getStarred' | 'getStarred2',
): Promise<SubsonicReply> => {
  const { profileId } = person;

  if (endpoint === 'star' || endpoint === 'unstar') {
    const ids = [...asked.texts('id'), ...asked.texts('albumId'), ...asked.texts('artistId')];

    if (ids.length === 0) {
      return failed(SUBSONIC_ERROR.missing, 'Say what to star with id, albumId or artistId.');
    }

    let kept = 0;

    for (const id of ids) {
      kept += await valence.viewing.favourite(profileId, id, endpoint === 'star').then(
        () => 1,
        () => 0,
      );
    }

    return kept === 0
      ? failed(SUBSONIC_ERROR.notFound, 'There is no such song, album or artist.')
      : ok();
  }

  if (endpoint === 'setRating') {
    const id = asked.text('id');
    const rating = asked.number('rating', -1, Number.MAX_SAFE_INTEGER);

    if (id === null || rating < 0 || rating > 5) {
      return failed(SUBSONIC_ERROR.missing, 'Say what to rate with id, and how with rating.');
    }

    try {
      await valence.viewing.rate(profileId, id, rating === 0 ? null : rating);
    } catch {
      return failed(SUBSONIC_ERROR.notFound, 'There is no such song.');
    }

    return ok();
  }

  const [songIds, artistIds] = await Promise.all([
    valence.viewing.favourites(profileId, 'track'),
    valence.viewing.favourites(profileId, 'artist'),
  ]);
  const shownArtists = artistIds.slice(0, MOST_STARRED);
  const [artists, artistStates] = await Promise.all([
    valence.library.details(shownArtists, { profileId }),
    valence.viewing.state(profileId, shownArtists),
  ]);
  const followedAt = new Map(artistStates.map((state) => [state.mediaId, state.favouritedAt]));
  const starred = {
    artist: artists.map((artist) => ({
      ...artistOf(artist),
      starred: followedAt.get(artist.id) ?? EPOCH,
    })),
    album: [],
    song: await songsOf(valence, profileId, songIds.slice(0, MOST_STARRED)),
  };

  return ok(endpoint === 'getStarred' ? { starred } : { starred2: starred });
};

export { answerStars };
