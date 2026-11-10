import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Answering } from './Answering';
import type { SubsonicReply } from './subsonicAnswer';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';
import { songsOf } from './songsOf';
import { HOST_PAGE, MOST_OFFSET, inPages } from './inPages';

const MOST_LISTED = 500;

const MOST_SEEDS = 50;

const MOST_NAME_CHARACTERS = 200;

type InfoEndpoint =
  | 'getGenres'
  | 'getSongsByGenre'
  | 'getLyrics'
  | 'getLyricsBySongId'
  | 'getSimilarSongs'
  | 'getSimilarSongs2'
  | 'getTopSongs'
  | 'getArtistInfo'
  | 'getArtistInfo2';

/**
 * The songs to start from when finding songs like something: a song itself, an album's songs, or
 * an artist's most played.
 *
 * @param valence - The host.
 * @param profileId - Who is listening.
 * @param found - What the songs should be like.
 * @returns The songs' ids.
 */
const seedsOf = async (
  valence: ValenceHost,
  profileId: string,
  found: MediaRef,
): Promise<string[]> => {
  const reading = { profileId };

  switch (found.kind) {
    case 'track':
      return [found.id];
    case 'album':
      return (await valence.library.children(found.id, reading)).map((track) => track.id);
    case 'artist':
      return (await valence.music.topSongs(found.id, reading)).map((track) => track.id);
    default:
      return [];
  }
};

/**
 * What the library knows about its music beyond the songs: genres and the songs in each, lyrics,
 * songs like a song, album or artist, an artist's most played songs, and a few words about an
 * artist.
 *
 * @param answering - The person, what they asked, and how to answer.
 * @param endpoint - Which of these it is.
 * @returns The answer.
 */
const answerMusicInfo = async (
  { valence, person, asked, ok, failed }: Answering,
  endpoint: InfoEndpoint,
): Promise<SubsonicReply> => {
  const { profileId } = person;
  const reading = { profileId };
  const songs = (refs: readonly MediaRef[]) =>
    songsOf(
      valence,
      profileId,
      refs.map((ref) => ref.id),
    );

  switch (endpoint) {
    case 'getGenres':
      return ok({
        genres: {
          genre: (await valence.music.genres(reading)).map((genre) => ({
            value: genre.name,
            songCount: genre.songs,
            albumCount: genre.albums,
          })),
        },
      });
    case 'getSongsByGenre': {
      const genre = asked.text('genre');

      if (genre === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say which genre with genre.');
      }

      if (genre.length > MOST_NAME_CHARACTERS) {
        return ok({ songsByGenre: { song: [] } });
      }

      const found = await inPages(
        asked.number('offset', 0, MOST_OFFSET),
        asked.number('count', 10, MOST_LISTED),
        (offset, limit) => valence.music.inGenre(genre, { offset, limit }, reading),
      );

      return ok({ songsByGenre: { song: await songs(found) } });
    }
    case 'getLyrics': {
      const artist = asked.text('artist')?.trim() ?? '';
      const title = asked.text('title')?.trim() ?? '';
      const track =
        artist === '' || title === ''
          ? null
          : await valence.music.findTrack({ title, artist }, reading);
      const lyrics = track === null ? null : await valence.music.lyrics(track.id, reading);

      return ok({
        lyrics:
          track === null || lyrics === null
            ? {}
            : {
                artist: track.artist,
                title: track.title,
                value: lyrics.lines.map((line) => line.text).join('\n'),
              },
      });
    }
    case 'getLyricsBySongId': {
      const id = asked.text('id');
      const track = id === null ? null : await valence.library.get(id, reading);

      if (id === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say which song with id.');
      }

      if (track?.kind !== 'track') {
        return failed(SUBSONIC_ERROR.notFound, 'There is no such song.');
      }

      const lyrics = await valence.music.lyrics(track.id, reading);

      return ok({
        lyricsList: {
          structuredLyrics:
            lyrics === null
              ? []
              : [
                  {
                    displayArtist: track.artist,
                    displayTitle: track.title,
                    lang: 'und',
                    synced: lyrics.isSynced,
                    line: lyrics.lines.map((line) => ({
                      start: lyrics.isSynced ? line.atMs : null,
                      value: line.text,
                    })),
                  },
                ],
        },
      });
    }
    case 'getSimilarSongs':
    case 'getSimilarSongs2': {
      const id = asked.text('id');
      const found = id === null ? null : await valence.library.get(id, reading);

      if (id === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say which song, album or artist with id.');
      }

      if (found === null) {
        return failed(SUBSONIC_ERROR.notFound, 'There is no such song, album or artist.');
      }

      const seeds = (await seedsOf(valence, profileId, found)).slice(0, MOST_SEEDS);
      const similar =
        seeds.length === 0
          ? []
          : await valence.music.similar(seeds, asked.number('count', 50, HOST_PAGE), reading);
      const song = await songs(similar);

      return ok(
        endpoint === 'getSimilarSongs' ? { similarSongs: { song } } : { similarSongs2: { song } },
      );
    }
    case 'getTopSongs': {
      const name = asked.text('artist')?.trim() ?? '';
      const [artist] =
        name === ''
          ? []
          : (await valence.library.search(name, ['artist'], reading)).filter(
              (each) => each.title.toLowerCase() === name.toLowerCase(),
            );
      const top = artist === undefined ? [] : await valence.music.topSongs(artist.id, reading);

      return ok({
        topSongs: { song: await songs(top.slice(0, asked.number('count', 50, MOST_LISTED))) },
      });
    }
    case 'getArtistInfo':
    case 'getArtistInfo2': {
      const id = asked.text('id');
      const found = id === null ? null : await valence.library.get(id, reading);

      if (id === null) {
        return failed(SUBSONIC_ERROR.missing, 'Say which artist with id.');
      }

      if (found === null) {
        return failed(SUBSONIC_ERROR.notFound, 'There is no such artist.');
      }

      const isArtist = found.kind === 'artist';
      const about = isArtist ? await valence.music.aboutArtist(found.id, reading) : null;
      const info = {
        biography: about?.bio ?? null,
        musicBrainzId: isArtist ? (found.externalIds.musicbrainz ?? null) : null,
        similarArtist: [],
      };

      return ok(endpoint === 'getArtistInfo' ? { artistInfo: info } : { artistInfo2: info });
    }
  }
};

export type { InfoEndpoint };

export { answerMusicInfo };
