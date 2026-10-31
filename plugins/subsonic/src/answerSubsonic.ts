import type { RouteContext, RouteRequest } from '@ValenceSDK/host/PluginDefinition';
import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import { albumsOf } from './albumsOf';
import { artistOf } from './artistOf';
import { folderOf } from './folderOf';
import { indexOf } from './indexOf';
import { itemsFrom } from './itemsFrom';
import { qualityFor } from './qualityFor';
import { randomItems } from './randomItems';
import { songsOf } from './songsOf';
import { subsonicAnswer } from './subsonicAnswer';
import type { Format } from './subsonicAnswer';

const MISSING = 10;

const NOT_FOUND = 70;

const GENERIC = 0;

const MOST_LISTED = 500;

const MOST_ARTISTS = 30_000;

const MOST_FOUND = 25;

const ALPHABETICAL = new Set(['alphabeticalByName', 'alphabeticalByArtist']);

const NOT_KEPT = new Set([
  'newest',
  'recent',
  'frequent',
  'highest',
  'starred',
  'byYear',
  'byGenre',
]);

const EMPTY: Readonly<Record<string, SubsonicBody>> = {
  getGenres: { genres: { genre: [] } },
  getStarred: { starred: { artist: [], album: [], song: [] } },
  getStarred2: { starred2: { artist: [], album: [], song: [] } },
  getArtistInfo: { artistInfo: {} },
  getArtistInfo2: { artistInfo2: {} },
  getAlbumInfo: { albumInfo: {} },
  getAlbumInfo2: { albumInfo: {} },
  getTopSongs: { topSongs: { song: [] } },
  getSimilarSongs: { similarSongs: { song: [] } },
  getSimilarSongs2: { similarSongs2: { song: [] } },
  getSongsByGenre: { songsByGenre: { song: [] } },
  getLyrics: { lyrics: {} },
  getLyricsBySongId: { lyricsList: { structuredLyrics: [] } },
  getNowPlaying: { nowPlaying: { entry: [] } },
  getScanStatus: { scanStatus: { scanning: false, count: 0 } },
  getPodcasts: { podcasts: { channel: [] } },
  getNewestPodcasts: { newestPodcasts: { episode: [] } },
  getInternetRadioStations: { internetRadioStations: { internetRadioStation: [] } },
  getBookmarks: { bookmarks: { bookmark: [] } },
  getShares: { shares: { share: [] } },
  getVideos: { videos: { video: [] } },
  getChatMessages: { chatMessages: { chatMessage: [] } },
  getPlayQueue: {},
  savePlayQueue: {},
  scrobble: {},
  star: {},
  unstar: {},
  setRating: {},
};

const EXTENSIONS = [
  { name: 'formPost', versions: [1] },
  { name: 'apiKeyAuthentication', versions: [1] },
];

/**
 * Reads one part of a form as it was meant, or as it came where it isn't properly encoded.
 *
 * @param part - The encoded part.
 * @returns What it says.
 */
const decoded = (part: string): string => {
  const spaced = part.replace(/\+/gu, ' ');

  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced;
  }
};

type Asked = {
  text: (name: string) => string | null;
  number: (name: string, fallback: number, most: number) => number;
};

/**
 * Reads what a Subsonic app asked, from the query and from a form it posted.
 *
 * @param request - The request.
 * @returns How to read each parameter.
 */
const askedOf = (request: RouteRequest): Asked => {
  const form =
    request.headers['content-type']?.startsWith('application/x-www-form-urlencoded') === true
      ? Object.fromEntries(
          request.body
            .split('&')
            .filter((pair) => pair !== '')
            .map((pair) => {
              const [name = '', value = ''] = pair.split('=');

              return [decoded(name), decoded(value)];
            }),
        )
      : {};
  const text = (name: string): string | null => request.query[name]?.[0] ?? form[name] ?? null;

  return {
    text,
    number: (name, fallback, most) => {
      const read = Number(text(name) ?? Number.NaN);

      return Number.isInteger(read) && read >= 0 ? Math.min(read, most) : fallback;
    },
  };
};

/**
 * Answers one request from a Subsonic app, as the person whose app password signed it in.
 *
 * @param context - The host and the person.
 * @param request - What the app asked.
 * @returns The answer, or what Valence should serve.
 */
const answerSubsonic = async ({ valence, person }: RouteContext, request: RouteRequest) => {
  const asked = askedOf(request);
  const format: Format = asked.text('f')?.startsWith('json') === true ? 'json' : 'xml';
  const ok = (body: SubsonicBody = {}) => subsonicAnswer(format, body);
  const failed = (code: number, message: string) => subsonicAnswer(format, {}, { code, message });
  const endpoint = request.path.replace(/^\/*(?:rest\/+)?/u, '').replace(/\.view$/u, '');

  if (person === null) {
    return failed(40, 'Sign in with an app password.');
  }

  const { profileId } = person;
  const reading = { profileId };
  const needed = (name: string): string | null => asked.text(name);

  switch (endpoint) {
    case 'ping':
      return ok();
    case 'getLicense':
      return ok({ license: { valid: true } });
    case 'getOpenSubsonicExtensions':
      return ok({ openSubsonicExtensions: EXTENSIONS });
    case 'getMusicFolders':
      return ok({ musicFolders: { musicFolder: [{ id: 1, name: 'Music' }] } });
    case 'getUser':
      return ok({
        user: {
          username: person.name,
          scrobblingEnabled: false,
          adminRole: false,
          settingsRole: false,
          downloadRole: true,
          uploadRole: false,
          playlistRole: false,
          coverArtRole: true,
          commentRole: false,
          podcastRole: false,
          streamRole: true,
          jukeboxRole: false,
          shareRole: false,
          videoConversionRole: false,
          folder: [1],
        },
      });
    case 'getArtists':
    case 'getIndexes':
      return ok({
        [endpoint === 'getArtists' ? 'artists' : 'indexes']: indexOf(
          await itemsFrom(valence, profileId, 'artist', 0, MOST_ARTISTS),
        ),
      });
    case 'getArtist': {
      const id = needed('id');
      const artist = id === null ? null : await valence.library.get(id, reading);

      if (id === null) {
        return failed(MISSING, 'Say which artist with id.');
      }

      if (artist?.kind !== 'artist') {
        return failed(NOT_FOUND, 'There is no such artist.');
      }

      const albums = await albumsOf(
        valence,
        profileId,
        await valence.library.children(id, reading),
      );

      return ok({ artist: { ...artistOf(artist, albums.length), album: albums } });
    }
    case 'getMusicDirectory':
    case 'getAlbum': {
      const id = needed('id');

      if (id === null) {
        return failed(MISSING, 'Say which album with id.');
      }

      const found = await valence.library.get(id, reading);

      if (found?.kind === 'artist' && endpoint === 'getMusicDirectory') {
        const albums = await albumsOf(
          valence,
          profileId,
          await valence.library.children(id, reading),
        );

        return ok({
          directory: { id: found.id, name: found.title, child: albums.map(folderOf) },
        });
      }

      if (found?.kind !== 'album') {
        return failed(NOT_FOUND, 'There is no such album.');
      }

      const [album = {}] = await albumsOf(valence, profileId, [found]);
      const tracks = await valence.library.children(id, reading);

      if (endpoint === 'getMusicDirectory') {
        return ok({
          directory: {
            id: found.id,
            parent: album['artistId'] ?? null,
            name: found.title,
            child: await songsOf(
              valence,
              profileId,
              tracks.map((track) => track.id),
            ),
          },
        });
      }

      return ok({
        album: {
          ...album,
          song: await songsOf(
            valence,
            profileId,
            tracks.map((track) => track.id),
          ),
        },
      });
    }
    case 'getSong': {
      const id = needed('id');
      const [song] = id === null ? [] : await songsOf(valence, profileId, [id]);

      if (id === null) {
        return failed(MISSING, 'Say which song with id.');
      }

      return song === undefined ? failed(NOT_FOUND, 'There is no such song.') : ok({ song });
    }
    case 'getAlbumList':
    case 'getAlbumList2': {
      const type = asked.text('type');
      const size = asked.number('size', 10, MOST_LISTED);
      const offset = asked.number('offset', 0, Number.MAX_SAFE_INTEGER);

      if (type === null || (type !== 'random' && !ALPHABETICAL.has(type) && !NOT_KEPT.has(type))) {
        return failed(MISSING, 'Say which albums with type.');
      }

      const listed = NOT_KEPT.has(type)
        ? []
        : type === 'random'
          ? await randomItems(valence, profileId, 'album', size)
          : await itemsFrom(valence, profileId, 'album', offset, size);
      const albums = await albumsOf(valence, profileId, listed);

      return ok(
        endpoint === 'getAlbumList'
          ? { albumList: { album: albums.map(folderOf) } }
          : { albumList2: { album: albums } },
      );
    }
    case 'getRandomSongs': {
      const tracks = await randomItems(
        valence,
        profileId,
        'track',
        asked.number('size', 10, MOST_LISTED),
      );

      return ok({
        randomSongs: {
          song: await songsOf(
            valence,
            profileId,
            tracks.map((track) => track.id),
          ),
        },
      });
    }
    case 'search2':
    case 'search3': {
      const found = await searchFor(valence, profileId, asked);

      return ok(
        endpoint === 'search2'
          ? { searchResult2: { ...found, album: found.albums.map(folderOf) } }
          : { searchResult3: { ...found, album: found.albums } },
      );
    }
    case 'stream':
    case 'download': {
      const id = needed('id');

      if (id === null) {
        return failed(MISSING, 'Say which song with id.');
      }

      const maxBitRate = asked.number('maxBitRate', 0, 100_000);

      return {
        serve: {
          kind: 'track' as const,
          mediaId: id,
          quality:
            endpoint === 'download'
              ? ('lossless' as const)
              : qualityFor(maxBitRate === 0 ? null : maxBitRate, asked.text('format')),
        },
      };
    }
    case 'getCoverArt': {
      const id = needed('id');

      if (id === null) {
        return failed(MISSING, 'Say which picture with id.');
      }

      return id.startsWith('ar-')
        ? { serve: { kind: 'artistImage' as const, artistId: id.slice(3) } }
        : { serve: { kind: 'albumArtwork' as const, albumId: id } };
    }
    case 'getPlaylists': {
      const kept = await valence.playlists.list(profileId);
      const playlists: SubsonicBody[] = [];

      for (const playlist of kept) {
        const read = await valence.playlists.read(profileId, playlist.id);

        playlists.push({
          id: playlist.id,
          name: playlist.name,
          owner: person.name,
          public: false,
          songCount: read?.entries.filter((entry) => entry.mediaId !== null).length ?? 0,
          duration: 0,
          created: '1970-01-01T00:00:00.000Z',
          changed: '1970-01-01T00:00:00.000Z',
        });
      }

      return ok({ playlists: { playlist: playlists } });
    }
    case 'getPlaylist': {
      const id = needed('id');
      const read = id === null ? null : await valence.playlists.read(profileId, id);

      if (id === null) {
        return failed(MISSING, 'Say which playlist with id.');
      }

      if (read === null) {
        return failed(NOT_FOUND, 'There is no such playlist.');
      }

      const songs = await songsOf(
        valence,
        profileId,
        read.entries.flatMap((entry) => (entry.mediaId === null ? [] : [entry.mediaId])),
      );

      return ok({
        playlist: {
          id: read.id,
          name: read.name,
          owner: person.name,
          public: false,
          songCount: songs.length,
          duration: songs.reduce(
            (all, song) => all + (typeof song.duration === 'number' ? song.duration : 0),
            0,
          ),
          created: '1970-01-01T00:00:00.000Z',
          changed: '1970-01-01T00:00:00.000Z',
          entry: songs,
        },
      });
    }
    default:
      return Object.hasOwn(EMPTY, endpoint)
        ? ok(EMPTY[endpoint])
        : failed(
            GENERIC,
            `Valence doesn’t answer ${endpoint === '' ? 'that' : endpoint} for Subsonic apps yet.`,
          );
  }
};

/**
 * Finds artists, albums and songs for a Subsonic search, from the offset the app asked for of each.
 * An empty query, which apps use to read the whole library, pages through everything; any other
 * finds at most 25 of each, as Valence's own search does.
 *
 * @param valence - The host.
 * @param profileId - Who is searching.
 * @param asked - What the app asked.
 * @returns The artists, albums and songs found.
 */
const searchFor = async (
  valence: ValenceHost,
  profileId: string,
  asked: Asked,
): Promise<{ artist: SubsonicBody[]; albums: SubsonicBody[]; song: SubsonicBody[] }> => {
  const query = (asked.text('query') ?? '').replace(/^"|"$/gu, '').trim();
  const reading = { profileId };
  const each = async (
    kind: 'artist' | 'album' | 'track',
    counted: string,
    offsetBy: string,
  ): Promise<MediaRef[]> => {
    const count = asked.number(counted, 20, MOST_LISTED);
    const offset = asked.number(offsetBy, 0, Number.MAX_SAFE_INTEGER);

    if (count === 0) {
      return [];
    }

    if (query === '') {
      return itemsFrom(valence, profileId, kind, offset, count);
    }

    return offset >= MOST_FOUND
      ? []
      : (await valence.library.search(query, [kind], reading)).slice(offset, offset + count);
  };
  const [artists, albums, songs] = await Promise.all([
    each('artist', 'artistCount', 'artistOffset'),
    each('album', 'albumCount', 'albumOffset'),
    each('track', 'songCount', 'songOffset'),
  ]);

  return {
    artist: artists.map((artist) => artistOf(artist)),
    albums: await albumsOf(valence, profileId, albums),
    song: await songsOf(
      valence,
      profileId,
      songs.map((song) => song.id),
    ),
  };
};

export { answerSubsonic };
