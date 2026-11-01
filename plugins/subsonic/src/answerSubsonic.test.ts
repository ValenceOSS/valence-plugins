import type { RouteRequest } from '@ValenceSDK/host/PluginDefinition';
import { aHost } from '@Shared/testing/aHost';
import { aMedia } from '@Shared/testing/aMedia';
import { answerSubsonic } from './answerSubsonic';

const LIBRARY = [
  aMedia({ id: 'ar1', title: 'The Band', kind: 'artist' }),
  aMedia({ id: 'al1', title: 'First Album', kind: 'album', artist: 'The Band', year: 2001 }),
  aMedia({
    id: 't1',
    title: 'Opening',
    kind: 'track',
    durationSeconds: 200,
    artist: 'The Band',
    album: 'First Album',
  }),
  aMedia({
    id: 't2',
    title: 'Closing',
    kind: 'track',
    durationSeconds: 100,
    artist: 'The Band',
    album: 'First Album',
  }),
];

const TRACK = {
  albumId: 'al1',
  artistId: 'ar1',
  discNumber: 1,
  file: { container: 'flac', sizeBytes: 1000, bitrateKbps: 900 },
};

const built = () =>
  aHost({
    library: LIBRARY,
    holds: { ar1: ['al1'], al1: ['t1', 't2'] },
    details: {
      al1: { artistId: 'ar1', genres: ['Rock'] },
      t1: { ...TRACK, trackNumber: 1 },
      t2: { ...TRACK, trackNumber: 2 },
    },
    playlists: [
      {
        id: 'pl1',
        name: 'Mine',
        profileId: 'p1',
        entries: [
          { entryId: 'e1', mediaId: 't2', missing: null },
          { entryId: 'e2', mediaId: null, missing: { title: 'Gone', artist: 'Nobody' } },
        ],
      },
    ],
  });

const asking = (path: string, query: Record<string, string> = {}): RouteRequest => ({
  method: 'GET',
  path,
  query: Object.fromEntries(
    Object.entries({ u: 'sam', f: 'json', ...query }).map(([k, v]) => [k, [v]]),
  ),
  headers: {},
  body: '',
  receivedAt: '2026-10-31T12:00:00.000Z',
});

const SAM = { profileId: 'p1', name: 'Sam' };

const answered = async (path: string, query: Record<string, string> = {}) => {
  const { host } = built();
  const answer = await answerSubsonic({ valence: host, person: SAM }, asking(path, query));

  return {
    host,
    answer,
    json: 'body' in answer ? JSON.parse(answer.body)['subsonic-response'] : null,
  };
};

describe('answerSubsonic', () => {
  it('answers a ping and says which OpenSubsonic extensions it speaks', async () => {
    expect((await answered('ping.view')).json).toMatchObject({ status: 'ok', openSubsonic: true });
    expect((await answered('getOpenSubsonicExtensions')).json.openSubsonicExtensions).toEqual([
      { name: 'formPost', versions: [1] },
      { name: 'apiKeyAuthentication', versions: [1] },
    ]);
  });

  it('answers in XML unless the app asks for JSON', async () => {
    const { host } = built();
    const answer = await answerSubsonic(
      { valence: host, person: SAM },
      { ...asking('ping.view'), query: { u: ['sam'] } },
    );

    expect(answer).toMatchObject({ contentType: 'application/xml' });
  });

  it('lists the artists by letter, reading the library as the person', async () => {
    const { host, json } = await answered('getArtists');

    expect(json.artists.index).toEqual([
      {
        name: 'B',
        artist: [
          {
            id: 'ar1',
            name: 'The Band',
            coverArt: 'ar-ar1',
          },
        ],
      },
    ]);
    expect(host.library.list).toHaveBeenCalledWith(
      { kind: 'artist', limit: 200 },
      { profileId: 'p1' },
    );
  });

  it('reads an artist with their albums, and an album with its songs in order', async () => {
    const artist = (await answered('getArtist', { id: 'ar1' })).json.artist;

    expect(artist).toMatchObject({
      id: 'ar1',
      albumCount: 1,
      album: [
        {
          id: 'al1',
          name: 'First Album',
          songCount: 2,
          duration: 300,
          genre: 'Rock',
          artistId: 'ar1',
        },
      ],
    });

    const album = (await answered('getAlbum', { id: 'al1' })).json.album;

    expect(album.song.map((song: { id: string }) => song.id)).toEqual(['t1', 't2']);
    expect(album.song[0]).toMatchObject({
      title: 'Opening',
      track: 1,
      discNumber: 1,
      suffix: 'flac',
      contentType: 'audio/flac',
      coverArt: 'al1',
      albumId: 'al1',
      artistId: 'ar1',
      duration: 200,
    });
  });

  it('says what is missing or not found, in the codes apps read', async () => {
    expect((await answered('getAlbum')).json.error).toEqual({
      code: 10,
      message: 'Say which album with id.',
    });
    expect((await answered('getAlbum', { id: 'nope' })).json.error.code).toBe(70);
    expect((await answered('getArtist', { id: 'al1' })).json.error.code).toBe(70);
    expect((await answered('createShare')).json.error.code).toBe(0);
    expect((await answered('getAlbumList2')).json.error.code).toBe(10);
  });

  it('answers what Valence doesn’t keep with nothing, rather than an error', async () => {
    expect((await answered('star', { id: 't1' })).json.status).toBe('ok');
    expect((await answered('getTopSongs', { artist: 'The Band' })).json.topSongs).toEqual({
      song: [],
    });
    expect((await answered('getPlayQueue')).json.status).toBe('ok');
    expect((await answered('getAlbumList2', { type: 'newest' })).json.albumList2).toEqual({
      album: [],
    });
  });

  it('names the person signed in, whatever the app said its user was', async () => {
    expect((await answered('getUser', { u: 'admin' })).json.user.username).toBe('Sam');
  });

  it('browses folders for the older half of the API: artists, their albums, and songs', async () => {
    const artist = (await answered('getMusicDirectory', { id: 'ar1' })).json.directory;

    expect(artist).toMatchObject({
      id: 'ar1',
      name: 'The Band',
      child: [{ id: 'al1', isDir: true, title: 'First Album', parent: 'ar1' }],
    });

    const album = (await answered('getMusicDirectory', { id: 'al1' })).json.directory;

    expect(album).toMatchObject({ id: 'al1', parent: 'ar1', child: [{ id: 't1' }, { id: 't2' }] });
    expect(
      (await answered('getAlbumList', { type: 'alphabeticalByName' })).json.albumList.album,
    ).toMatchObject([{ id: 'al1', isDir: true, title: 'First Album' }]);
  });

  it('gives a song the file name ending, type and path of its real file', async () => {
    const { host } = aHost({
      library: LIBRARY,
      details: {
        t1: { ...TRACK, file: { container: 'm4a/isom/iso2', sizeBytes: 1, bitrateKbps: 256 } },
      },
    });
    const answer = await answerSubsonic(
      { valence: host, person: SAM },
      asking('getSong', { id: 't1' }),
    );
    const song = 'body' in answer ? JSON.parse(answer.body)['subsonic-response'].song : null;

    expect(song).toMatchObject({
      suffix: 'm4a',
      contentType: 'audio/mp4',
      path: 'The Band/First Album/Opening.m4a',
    });
  });

  it('finds the endpoint when the address ends with a slash', async () => {
    expect((await answered('/rest/ping.view')).json.status).toBe('ok');
  });

  it('asks Valence to serve a song at the bit rate asked for, the original to download, and covers', async () => {
    expect((await answered('stream', { id: 't1', maxBitRate: '192' })).answer).toEqual({
      serve: { kind: 'track', mediaId: 't1', quality: 'normal' },
    });
    expect((await answered('stream', { id: 't1' })).answer).toEqual({
      serve: { kind: 'track', mediaId: 't1', quality: 'lossless' },
    });
    expect((await answered('download', { id: 't1', maxBitRate: '96' })).answer).toEqual({
      serve: { kind: 'track', mediaId: 't1', quality: 'lossless' },
    });
    expect((await answered('getCoverArt', { id: 'al1' })).answer).toEqual({
      serve: { kind: 'albumArtwork', albumId: 'al1' },
    });
    expect((await answered('getCoverArt', { id: 'ar-ar1' })).answer).toEqual({
      serve: { kind: 'artistImage', artistId: 'ar1' },
    });
  });

  it('searches by name, and reads the whole library page by page for an empty query', async () => {
    const found = (await answered('search3', { query: 'open' })).json.searchResult3;

    expect(found.song.map((song: { id: string }) => song.id)).toEqual(['t1']);

    const everything = (await answered('search3', { query: '""', songCount: '1', songOffset: '1' }))
      .json.searchResult3;

    expect(everything.artist).toHaveLength(1);
    expect(everything.song.map((song: { id: string }) => song.id)).toEqual(['t1']);

    const later = (await answered('search3', { query: 'ing', songCount: '1', songOffset: '1' }))
      .json.searchResult3;

    expect(later.song.map((song: { id: string }) => song.id)).toEqual(['t2']);
    expect(
      (await answered('search3', { query: 'ing', songOffset: '25' })).json.searchResult3.song,
    ).toEqual([]);
  });

  it('lists the person’s playlists, counting only songs the library has', async () => {
    expect((await answered('getPlaylists')).json.playlists.playlist).toMatchObject([
      { id: 'pl1', name: 'Mine', songCount: 1, owner: 'Sam' },
    ]);
    expect((await answered('getPlaylist', { id: 'pl1' })).json.playlist.entry).toMatchObject([
      { id: 't2' },
    ]);
  });

  it('reads a form an app posted', async () => {
    const { host } = built();
    const answer = await answerSubsonic(
      { valence: host, person: SAM },
      {
        ...asking('getAlbum'),
        method: 'POST',
        query: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'u=sam&id=al1&f=json',
      },
    );

    expect('body' in answer ? JSON.parse(answer.body)['subsonic-response'].album.id : null).toBe(
      'al1',
    );
  });

  it('answers nobody with a sign-in error', async () => {
    const { host } = built();

    expect(
      await answerSubsonic({ valence: host, person: null }, asking('ping.view')),
    ).toMatchObject({
      body: expect.stringContaining('"code":40'),
    });
  });
});
