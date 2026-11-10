import type { AlbumOrder, MediaRef } from '@ValenceSDK/host/ValenceHost';
import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';
import { albumsOf } from './albumsOf';
import { folderOf } from './folderOf';
import { randomItems } from './randomItems';
import { MOST_OFFSET, inPages } from './inPages';

const MOST_LISTED = 500;

const ORDERS: Readonly<Record<string, AlbumOrder>> = {
  newest: 'added',
  recent: 'recentlyPlayed',
  frequent: 'mostPlayed',
  highest: 'rated',
  alphabeticalByName: 'title',
  alphabeticalByArtist: 'artist',
  byYear: 'year',
  byGenre: 'title',
};

const LATEST_YEAR = 9999;

const MOST_GENRE_CHARACTERS = 200;

/**
 * A list of albums, in the order the app asked for: newest, recently or most played, highest
 * rated by the person, by name, artist, year or genre, or at random. Starred albums is always
 * empty, since Valence keeps no liked albums.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @param endpoint - Whether the app wants the albums as folders or by tags.
 * @returns The answer.
 */
const answerAlbumList = async (
  { valence, person, asked, ok, failed }: Answering,
  endpoint: 'getAlbumList' | 'getAlbumList2',
): Promise<SubsonicReply> => {
  const { profileId } = person;
  const type = asked.text('type');
  const size = asked.number('size', 10, MOST_LISTED);
  const offset = asked.number('offset', 0, MOST_OFFSET);
  const order = type === null ? undefined : ORDERS[type];
  const genre = asked.text('genre');

  if (type === null || (type !== 'random' && type !== 'starred' && order === undefined)) {
    return failed(SUBSONIC_ERROR.missing, 'Say which albums with type.');
  }

  if (type === 'byGenre' && genre === null) {
    return failed(SUBSONIC_ERROR.missing, 'Say which genre with genre.');
  }

  if (genre !== null && genre.length > MOST_GENRE_CHARACTERS) {
    return ok(
      endpoint === 'getAlbumList' ? { albumList: { album: [] } } : { albumList2: { album: [] } },
    );
  }

  const listed: MediaRef[] =
    type === 'random'
      ? await randomItems(valence, profileId, 'album', size)
      : order === undefined
        ? []
        : await inPages(offset, size, (from, limit) =>
            valence.music.albums(
              {
                order,
                offset: from,
                limit,
                ...(type === 'byGenre' && genre !== null ? { genre } : {}),
                ...(type === 'byYear'
                  ? {
                      years: {
                        from: asked.number('fromYear', 0, LATEST_YEAR),
                        to: asked.number('toYear', LATEST_YEAR, LATEST_YEAR),
                      },
                    }
                  : {}),
              },
              { profileId },
            ),
          );
  const albums = await albumsOf(valence, profileId, listed);

  return ok(
    endpoint === 'getAlbumList'
      ? { albumList: { album: albums.map(folderOf) } }
      : { albumList2: { album: albums } },
  );
};

export { answerAlbumList };
