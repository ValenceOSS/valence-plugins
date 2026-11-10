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
    lyrics: {
      t1: {
        isSynced: true,
        lines: [
          { atMs: 1000, text: 'First line' },
          { atMs: 4000, text: 'Second line' },
        ],
      },
    },
    about: { ar1: { bio: 'A band.', sourceUrl: 'https://example.test/the-band' } },
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

const asking = (path: string, query: Record<string, string | string[]> = {}): RouteRequest => ({
  method: 'GET',
  path,
  query: Object.fromEntries(
    Object.entries({ u: 'sam', f: 'json', ...query }).map(([k, v]) => [
      k,
      Array.isArray(v) ? v : [v],
    ]),
  ),
  headers: {},
  body: '',
  receivedAt: '2026-10-31T12:00:00.000Z',
});

const SAM = { profileId: 'p1', name: 'Sam', login: 'sam-1' };

/**
 * A host and a way to ask it several things in turn as Sam, so what one call changes the next one
 * reads.
 *
 * @returns The host, what it keeps, and how to ask.
 */
const talking = () => {
  const made = built();
  const ask = async (path: string, query: Record<string, string | string[]> = {}) => {
    const answer = await answerSubsonic({ valence: made.host, person: SAM }, asking(path, query));

    return 'body' in answer ? JSON.parse(answer.body)['subsonic-response'] : null;
  };

  return { ...made, ask };
};

const answered = async (path: string, query: Record<string, string | string[]> = {}) => {
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
      { name: 'songLyrics', versions: [1] },
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
    expect((await answered('getPodcasts')).json.podcasts).toEqual({ channel: [] });
    expect((await answered('getNowPlaying')).json.nowPlaying).toEqual({ entry: [] });
    expect((await answered('getAlbumList2', { type: 'starred' })).json.albumList2).toEqual({
      album: [],
    });
  });

  it('says the person may make playlists and scrobble', async () => {
    expect((await answered('getUser')).json.user).toMatchObject({
      scrobblingEnabled: true,
      playlistRole: true,
    });
  });

  it('names the person by the login their app signed in with, whatever the app said its user was', async () => {
    expect((await answered('getUser', { u: 'admin' })).json.user.username).toBe('sam-1');
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

  it('lists the person’s playlists, counting and timing only songs the library has', async () => {
    expect((await answered('getPlaylists')).json.playlists.playlist).toMatchObject([
      { id: 'pl1', name: 'Mine', songCount: 1, duration: 100, owner: 'sam-1' },
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
  it('stars songs and artists, rates songs, and lists what was starred', async () => {
    const { ask, liked, stars } = talking();

    expect((await ask('star', { id: ['t1', 't2'], artistId: 'ar1', albumId: 'al1' })).status).toBe(
      'ok',
    );
    expect((await ask('unstar', { id: 't2' })).status).toBe('ok');
    expect((await ask('setRating', { id: 't1', rating: '4' })).status).toBe('ok');
    expect([...liked.keys()]).toEqual(['t1', 'ar1']);
    expect(stars.get('t1')).toBe(4);

    const starred = (await ask('getStarred2')).starred2;

    expect(starred.artist).toMatchObject([{ id: 'ar1', name: 'The Band' }]);
    expect(starred.album).toEqual([]);
    expect(starred.song).toMatchObject([
      { id: 't1', userRating: 4, starred: '2026-11-01T09:00:00.000Z' },
    ]);
    expect(starred.artist[0].starred).toBe('2026-11-01T09:00:00.000Z');
    expect((await ask('getStarred')).starred).toMatchObject({
      artist: [{ id: 'ar1' }],
      album: [],
      song: [{ id: 't1' }],
    });

    await ask('setRating', { id: 't1', rating: '0' });

    expect(stars.has('t1')).toBe(false);
    expect((await ask('star', {})).error.code).toBe(10);
    expect((await ask('star', { id: 'nothing' })).error.code).toBe(70);
    expect((await ask('setRating', { id: 't1' })).error.code).toBe(10);
    expect((await ask('setRating', { id: 'nothing', rating: '3' })).error.code).toBe(70);
  });

  it('counts plays at the times the app gives, and says what it is playing', async () => {
    const { ask, played, playing } = talking();

    await ask('scrobble', { id: ['t1', 'missing', 't2'], time: ['1762000000000', '0', 'x'] });
    await ask('scrobble', { id: 't2', submission: 'false', c: 'Feishin' });

    expect(played).toEqual([
      { profileId: 'p1', trackId: 't1', playedAt: '2025-11-01T12:26:40.000Z' },
      { profileId: 'p1', trackId: 't2', playedAt: null },
    ]);
    expect(playing).toEqual([{ profileId: 'p1', trackId: 't2', client: 'Feishin' }]);
    expect((await ask('scrobble', {})).error.code).toBe(10);
    expect((await ask('scrobble', { id: 'al1', submission: 'false' })).error.code).toBe(70);
  });

  it('keeps the play queue for the person, and forgets it when the app saves an empty one', async () => {
    const { ask } = talking();

    expect((await ask('getPlayQueue')).playQueue).toBeUndefined();

    await ask('savePlayQueue', {
      id: ['t2', 't1'],
      current: 't1',
      position: '42000',
      c: 'Feishin',
    });

    expect((await ask('getPlayQueue')).playQueue).toMatchObject({
      current: 't1',
      position: 42000,
      username: 'sam-1',
      changedBy: 'Feishin',
      changed: '2026-10-31T12:00:00.000Z',
      entry: [{ id: 't2' }, { id: 't1' }],
    });

    await ask('savePlayQueue', {});

    expect((await ask('getPlayQueue')).playQueue).toBeUndefined();
  });

  it('makes, changes and removes the person’s playlists', async () => {
    const { ask, playlists } = talking();

    const made = (await ask('createPlaylist', { name: 'Drive', songId: ['t1', 't2'] })).playlist;

    expect(made).toMatchObject({
      name: 'Drive',
      songCount: 2,
      entry: [{ id: 't1' }, { id: 't2' }],
    });

    await ask('updatePlaylist', {
      playlistId: made.id,
      name: 'Long drive',
      songIndexToRemove: '0',
      songIdToAdd: 't1',
    });

    expect(playlists.get(made.id)).toMatchObject({
      name: 'Long drive',
      entries: [{ mediaId: 't2' }, { mediaId: 't1' }],
    });

    const replaced = (await ask('createPlaylist', { playlistId: 'pl1', songId: 't1' })).playlist;

    expect(replaced.entry).toMatchObject([{ id: 't1' }]);
    expect(playlists.get('pl1')?.entries.map((entry) => entry.mediaId)).toEqual([null, 't1']);

    await ask('deletePlaylist', { id: made.id });

    expect(playlists.has(made.id)).toBe(false);
    expect((await ask('createPlaylist', {})).error.code).toBe(10);
    expect((await ask('createPlaylist', { playlistId: 'nope' })).error.code).toBe(70);
    expect((await ask('updatePlaylist', {})).error.code).toBe(10);
    expect((await ask('updatePlaylist', { playlistId: 'nope' })).error.code).toBe(70);
    expect((await ask('deletePlaylist', {})).error.code).toBe(10);
    expect((await ask('deletePlaylist', { id: 'nope' })).error.code).toBe(70);
  });

  it('says a playlist change Valence refused failed, not that the playlist is missing', async () => {
    const { ask, host } = talking();

    host.playlists.add.mockRejectedValueOnce(new Error('That playlist fills itself.'));

    const answer = await ask('updatePlaylist', { playlistId: 'pl1', songIdToAdd: 't1' });

    expect(answer.error.code).toBe(0);
  });

  it('lists albums in each order an app asks for, by genre and by year', async () => {
    const { ask, host } = talking();

    for (const [type, order] of [
      ['newest', 'added'],
      ['recent', 'recentlyPlayed'],
      ['frequent', 'mostPlayed'],
      ['highest', 'rated'],
      ['alphabeticalByArtist', 'artist'],
    ]) {
      expect((await ask('getAlbumList2', { type: type ?? '' })).albumList2.album).toMatchObject([
        { id: 'al1' },
      ]);
      expect(host.music.albums).toHaveBeenLastCalledWith(
        { order, offset: 0, limit: 10 },
        { profileId: 'p1' },
      );
    }

    await ask('getAlbumList2', { type: 'byYear', fromYear: '2010', toYear: '1990', size: '5' });

    expect(host.music.albums).toHaveBeenLastCalledWith(
      { order: 'year', offset: 0, limit: 5, years: { from: 2010, to: 1990 } },
      { profileId: 'p1' },
    );
    expect(
      (await ask('getAlbumList2', { type: 'byGenre', genre: 'Rock' })).albumList2.album,
    ).toMatchObject([{ id: 'al1' }]);
    expect(
      (await ask('getAlbumList2', { type: 'byGenre', genre: 'Jazz' })).albumList2.album,
    ).toEqual([]);
    expect((await ask('getAlbumList2', { type: 'byGenre' })).error.code).toBe(10);
    expect((await ask('getAlbumList2', { type: 'loudest' })).error.code).toBe(10);
    expect((await ask('getAlbumList2', { type: 'random' })).albumList2.album).toMatchObject([
      { id: 'al1' },
    ]);
  });

  it('lists genres with their counts, and the songs in one', async () => {
    const { ask } = talking();

    expect((await ask('getGenres')).genres.genre).toEqual([
      { value: 'Rock', songCount: 2, albumCount: 1 },
    ]);
    expect(
      (await ask('getSongsByGenre', { genre: 'Rock', count: '1' })).songsByGenre.song,
    ).toMatchObject([{ id: 't1' }]);
    expect((await ask('getSongsByGenre', {})).error.code).toBe(10);
  });

  it('gives lyrics by artist and title, and timed lines by song', async () => {
    const { ask } = talking();

    expect((await ask('getLyrics', { artist: 'The Band', title: 'Opening' })).lyrics).toEqual({
      artist: 'The Band',
      title: 'Opening',
      value: 'First line\nSecond line',
    });
    expect((await ask('getLyrics', { artist: 'The Band', title: 'Closing' })).lyrics).toEqual({});
    expect((await ask('getLyrics', {})).lyrics).toEqual({});
    expect((await ask('getLyricsBySongId', { id: 't1' })).lyricsList.structuredLyrics).toEqual([
      {
        displayArtist: 'The Band',
        displayTitle: 'Opening',
        lang: 'und',
        synced: true,
        line: [
          { start: 1000, value: 'First line' },
          { start: 4000, value: 'Second line' },
        ],
      },
    ]);
    expect((await ask('getLyricsBySongId', { id: 't2' })).lyricsList.structuredLyrics).toEqual([]);
    expect((await ask('getLyricsBySongId', {})).error.code).toBe(10);
    expect((await ask('getLyricsBySongId', { id: 'al1' })).error.code).toBe(70);
  });

  it('finds songs like a song, an album or an artist, and an artist’s most played', async () => {
    const { ask, host } = talking();

    expect((await ask('getSimilarSongs2', { id: 't1' })).similarSongs2.song).toMatchObject([
      { id: 't2' },
    ]);
    expect(host.music.similar).toHaveBeenLastCalledWith(['t1'], 50, { profileId: 'p1' });
    await ask('getSimilarSongs', { id: 'al1', count: '5' });
    expect(host.music.similar).toHaveBeenLastCalledWith(['t1', 't2'], 5, { profileId: 'p1' });
    expect((await ask('getSimilarSongs', { id: 'ar1' })).similarSongs.song).toEqual([]);
    expect((await ask('getSimilarSongs2', {})).error.code).toBe(10);
    expect((await ask('getSimilarSongs2', { id: 'nothing' })).error.code).toBe(70);
    expect(
      (await ask('getTopSongs', { artist: 'the band', count: '1' })).topSongs.song,
    ).toMatchObject([{ id: 't1' }]);
    expect((await ask('getTopSongs', { artist: 'Nobody' })).topSongs.song).toEqual([]);
  });

  it('says what Valence knows about an artist', async () => {
    const { ask } = talking();

    expect((await ask('getArtistInfo2', { id: 'ar1' })).artistInfo2).toEqual({
      biography: 'A band.',
      similarArtist: [],
    });
    expect((await ask('getArtistInfo', { id: 'al1' })).artistInfo).toEqual({ similarArtist: [] });
    expect((await ask('getArtistInfo2', {})).error.code).toBe(10);
  });

  it('writes a genre’s name and a song’s lyrics as the text of their elements in XML', async () => {
    const xml = async (path: string, query: Record<string, string> = {}) => {
      const answer = await answerSubsonic(
        { valence: talking().host, person: SAM },
        asking(path, { ...query, f: 'xml' }),
      );

      return 'body' in answer ? answer.body : '';
    };

    expect(await xml('getGenres')).toContain('<genre songCount="2" albumCount="1">Rock</genre>');
    expect(await xml('getLyrics', { artist: 'The Band', title: 'Opening' })).toContain(
      '<lyrics artist="The Band" title="Opening">First line&#10;Second line</lyrics>',
    );
  });

  it('reads every value of a parameter given more than once, from the query and a form', async () => {
    const { host, liked } = talking();

    await answerSubsonic(
      { valence: host, person: SAM },
      {
        ...asking('star', { id: 't1' }),
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'id=t2&artistId=ar1',
      },
    );

    expect([...liked.keys()]).toEqual(['t1', 't2', 'ar1']);
  });
  it('asks Valence for at most 200 at a time however many an app asks for', async () => {
    const { ask, host } = talking();

    expect(
      (await ask('getAlbumList2', { type: 'newest', size: '500' })).albumList2.album,
    ).toHaveLength(1);
    expect(host.music.albums).toHaveBeenCalledWith(
      { order: 'added', offset: 0, limit: 200 },
      { profileId: 'p1' },
    );
    expect((await ask('getSongsByGenre', { genre: 'Rock', count: '500' })).status).toBe('ok');
    expect((await ask('getSimilarSongs2', { id: 't1', count: '500' })).status).toBe('ok');
    expect(host.music.similar).toHaveBeenLastCalledWith(['t1'], 200, { profileId: 'p1' });
  });

  it('asks Valence for a cover by any plain id, and for an artist’s picture by their cover id', async () => {
    expect((await answered('getCoverArt', { id: 'ar1' })).answer).toEqual({
      serve: { kind: 'albumArtwork', albumId: 'ar1' },
    });
    expect((await answered('getCoverArt', { id: 'ar-ar1' })).answer).toEqual({
      serve: { kind: 'artistImage', artistId: 'ar1' },
    });
    expect((await answered('getCoverArt', { id: 'al1' })).answer).toEqual({
      serve: { kind: 'albumArtwork', albumId: 'al1' },
    });
  });
  it('shows a song held twice twice, and removes by the positions the app was shown', async () => {
    const { ask, playlists } = talking();
    const id = (await ask('createPlaylist', { name: 'Twice', songId: ['t1', 't2', 't1'] })).playlist
      .id;

    playlists.get(id)?.entries.splice(1, 0, { entryId: 'film', mediaId: 'ar1', missing: null });

    expect(
      (await ask('getPlaylist', { id })).playlist.entry.map((song: { id: string }) => song.id),
    ).toEqual(['t1', 't2', 't1']);

    await ask('updatePlaylist', { playlistId: id, songIndexToRemove: '2' });

    expect(playlists.get(id)?.entries.map((entry) => entry.mediaId)).toEqual(['t1', 'ar1', 't2']);
    expect((await ask('getPlaylists')).playlists.playlist).toContainEqual(
      expect.objectContaining({ id, songCount: 2 }),
    );
  });

  it('lists playlists without reading anyone’s likes or plays', async () => {
    const { ask, host } = talking();

    await ask('getPlaylists');

    expect(host.viewing.state).not.toHaveBeenCalled();
    expect((await ask('getPlaylists')).playlists.playlist[0]).not.toHaveProperty('entry');
  });

  it('stars what it can in a batch, and fails only when nothing could be starred', async () => {
    const { ask, liked } = talking();

    expect((await ask('star', { id: ['t1', 'gone', 't2'] })).status).toBe('ok');
    expect([...liked.keys()]).toEqual(['t1', 't2']);
    expect((await ask('star', { id: ['gone', 'also-gone'] })).error.code).toBe(70);
  });

  it('refuses a rating outside 0 to 5', async () => {
    expect((await answered('setRating', { id: 't1', rating: '7' })).json.error.code).toBe(10);
  });

  it('says an artist is starred on their own page', async () => {
    const { ask } = talking();

    expect((await ask('getArtist', { id: 'ar1' })).artist).not.toHaveProperty('starred');

    await ask('star', { artistId: 'ar1' });

    expect((await ask('getArtist', { id: 'ar1' })).artist.starred).toBe('2026-11-01T09:00:00.000Z');
  });

  it('gives artist info only for an artist, and says when there is no such thing', async () => {
    expect((await answered('getArtistInfo2', { id: 'nothing' })).json.error.code).toBe(70);
    expect((await answered('getArtistInfo', { id: 'al1' })).json.artistInfo).toEqual({
      similarArtist: [],
    });
  });

  it('writes an artist’s biography as an element in XML, as Subsonic does', async () => {
    const answer = await answerSubsonic(
      { valence: built().host, person: SAM },
      asking('getArtistInfo2', { id: 'ar1', f: 'xml' }),
    );

    expect('body' in answer ? answer.body : '').toContain(
      '<artistInfo2><biography>A band.</biography></artistInfo2>',
    );
  });

  it('counts a scrobble whose time makes no sense as heard now, without failing the rest', async () => {
    const { ask, played } = talking();

    expect((await ask('scrobble', { id: ['t1', 't2'], time: ['1e20', '-5'] })).status).toBe('ok');
    expect(played.map((play) => play.playedAt)).toEqual([null, null]);
  });

  it('keeps a client name and a now-playing request within what Valence accepts', async () => {
    const { ask, playing } = talking();

    await ask('scrobble', { id: 't1', submission: 'false', c: 'x'.repeat(500) });

    expect(playing[0]?.client).toHaveLength(200);
  });

  it('keeps only sensible ids in a play queue, and a current song that is in it', async () => {
    const { ask } = talking();

    await ask('savePlayQueue', { id: ['t1', 'x'.repeat(300)], current: 't2' });

    expect((await ask('getPlayQueue')).playQueue).toMatchObject({
      entry: [{ id: 't1' }],
    });
    expect((await ask('getPlayQueue')).playQueue).not.toHaveProperty('current');
  });

  it('answers an offset past Valence’s limit and an over-long genre without failing', async () => {
    const { ask, host } = talking();

    expect((await ask('getAlbumList2', { type: 'newest', offset: '99999999' })).status).toBe('ok');
    expect(host.music.albums).toHaveBeenLastCalledWith(
      { order: 'added', offset: 1_000_000, limit: 10 },
      { profileId: 'p1' },
    );
    expect((await ask('getSongsByGenre', { genre: 'g'.repeat(300) })).songsByGenre).toEqual({
      song: [],
    });
    expect(
      (await ask('getAlbumList2', { type: 'byGenre', genre: 'g'.repeat(300) })).albumList2,
    ).toEqual({ album: [] });

    await ask('getAlbumList2', { type: 'newest', genre: 'g'.repeat(300) });

    expect(host.music.albums).toHaveBeenLastCalledWith(
      { order: 'added', offset: 0, limit: 10 },
      { profileId: 'p1' },
    );
  });

  it('says so when Valence can’t clear or read the play queue', async () => {
    const { ask, host } = talking();

    host.storage.delete.mockRejectedValueOnce(new Error('Storage is unavailable.'));
    host.storage.get.mockRejectedValueOnce(new Error('Storage is unavailable.'));

    expect((await ask('savePlayQueue', {})).error.code).toBe(0);
    expect((await ask('getPlayQueue')).error.code).toBe(0);
  });
});
