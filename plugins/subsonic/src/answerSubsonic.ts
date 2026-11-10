import type { RouteContext, RouteRequest } from '@ValenceSDK/host/PluginDefinition';
import type { MediaRef, ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { SubsonicBody } from './SubsonicBody';
import type { Answering } from './Answering';
import type { Asked } from './Asked';
import { askedOf } from './askedOf';
import { SUBSONIC_ERROR } from './SUBSONIC_ERROR';
import { answerAlbumList } from './answerAlbumList';
import { answerMusicInfo } from './answerMusicInfo';
import type { InfoEndpoint } from './answerMusicInfo';
import { answerPlayQueue } from './answerPlayQueue';
import { answerPlaylistChanges } from './answerPlaylistChanges';
import { answerScrobble } from './answerScrobble';
import { answerStars } from './answerStars';
import { playlistOf } from './playlistOf';
import { EPOCH } from './EPOCH';
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

const MISSING = SUBSONIC_ERROR.missing;

const NOT_FOUND = SUBSONIC_ERROR.notFound;

const GENERIC = SUBSONIC_ERROR.generic;

const MOST_LISTED = 500;

const MOST_ARTISTS = 30_000;

const MOST_FOUND = 25;

const EMPTY: Readonly<Record<string, SubsonicBody>> = {
  getAlbumInfo: { albumInfo: {} },
  getAlbumInfo2: { albumInfo: {} },
  getNowPlaying: { nowPlaying: { entry: [] } },
  getScanStatus: { scanStatus: { scanning: false, count: 0 } },
  getPodcasts: { podcasts: { channel: [] } },
  getNewestPodcasts: { newestPodcasts: { episode: [] } },
  getInternetRadioStations: { internetRadioStations: { internetRadioStation: [] } },
  getBookmarks: { bookmarks: { bookmark: [] } },
  getShares: { shares: { share: [] } },
  getVideos: { videos: { video: [] } },
  getChatMessages: { chatMessages: { chatMessage: [] } },
};

const EXTENSIONS = [
  { name: 'formPost', versions: [1] },
  { name: 'apiKeyAuthentication', versions: [1] },
  { name: 'songLyrics', versions: [1] },
];

const INFO: ReadonlySet<string> = new Set([
  'getGenres',
  'getSongsByGenre',
  'getLyrics',
  'getLyricsBySongId',
  'getSimilarSongs',
  'getSimilarSongs2',
  'getTopSongs',
  'getArtistInfo',
  'getArtistInfo2',
]);

/**
 * Whether an endpoint is one answered with what the library knows about its music.
 *
 * @param endpoint - The endpoint.
 * @returns Whether it is.
 */
const isInfo = (endpoint: string): endpoint is InfoEndpoint => INFO.has(endpoint);

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
  const answering: Answering = {
    valence,
    person,
    asked,
    receivedAt: request.receivedAt,
    ok,
    failed,
  };

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
          username: person.login,
          scrobblingEnabled: true,
          adminRole: false,
          settingsRole: false,
          downloadRole: true,
          uploadRole: false,
          playlistRole: true,
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

      const [albums, [state]] = await Promise.all([
        albumsOf(valence, profileId, await valence.library.children(id, reading)),
        valence.viewing.state(profileId, [id]),
      ]);

      return ok({
        artist: {
          ...artistOf(artist, albums.length),
          starred: state?.isFavourite === true ? EPOCH : null,
          album: albums,
        },
      });
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
    case 'getAlbumList2':
      return answerAlbumList(answering, endpoint);
    case 'star':
    case 'unstar':
    case 'setRating':
    case 'getStarred':
    case 'getStarred2':
      return answerStars(answering, endpoint);
    case 'scrobble':
      return answerScrobble(answering);
    case 'getPlayQueue':
    case 'savePlayQueue':
      return answerPlayQueue(answering, endpoint);
    case 'createPlaylist':
    case 'updatePlaylist':
    case 'deletePlaylist':
      return answerPlaylistChanges(answering, endpoint);
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

      if (id.startsWith('ar-')) {
        return { serve: { kind: 'artistImage' as const, artistId: id.slice(3) } };
      }

      return (await valence.library.get(id, reading))?.kind === 'artist'
        ? { serve: { kind: 'artistImage' as const, artistId: id } }
        : { serve: { kind: 'albumArtwork' as const, albumId: id } };
    }
    case 'getPlaylists': {
      const kept = await valence.playlists.list(profileId);
      const playlists: SubsonicBody[] = [];

      for (const playlist of kept) {
        const read = await valence.playlists.read(profileId, playlist.id);

        if (read !== null) {
          playlists.push(await playlistOf(valence, person, read, false));
        }
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

      return ok({ playlist: await playlistOf(valence, person, read) });
    }
    default:
      if (isInfo(endpoint)) {
        return answerMusicInfo(answering, endpoint);
      }

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
