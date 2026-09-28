import { aHost } from '@Shared/testing/aHost';
import { readApplePlaylist } from './readApplePlaylist';

describe('readApplePlaylist', () => {
  it('reads a public playlist and its further pages with the developer token', async () => {
    const { host } = aHost({
      answers: (url) =>
        url.includes('offset')
          ? {
              status: 200,
              text: JSON.stringify({
                data: [{ attributes: { name: 'Two', artistName: 'Robyn' } }],
              }),
            }
          : {
              status: 200,
              text: JSON.stringify({
                data: [
                  {
                    attributes: { name: 'Pop' },
                    relationships: {
                      tracks: {
                        data: [
                          {
                            attributes: {
                              name: 'One',
                              artistName: 'Robyn',
                              albumName: 'Body Talk',
                              isrc: 'SE1',
                            },
                          },
                          {},
                        ],
                        next: '/v1/catalog/gb/playlists/pl.abcdefgh/tracks?offset=100',
                      },
                    },
                  },
                ],
              }),
            },
    });
    const playlist = await readApplePlaylist(host, 'dev', 'gb', 'pl.abcdefgh');

    expect(playlist).toEqual({
      source: 'apple',
      id: 'pl.abcdefgh',
      name: 'Pop',
      tracks: [
        { title: 'One', artist: 'Robyn', album: 'Body Talk', isrc: 'SE1' },
        { title: 'Two', artist: 'Robyn', album: null, isrc: null },
      ],
    });
    expect(host.http.fetch.mock.calls[0]?.[1]).toEqual({
      headers: { authorization: 'Bearer dev' },
    });
  });

  it('does not follow a next page that points off Apple’s API', async () => {
    const { host } = aHost({
      answers: () => ({
        status: 200,
        text: JSON.stringify({
          data: [
            {
              attributes: { name: 'Pop' },
              relationships: { tracks: { data: [], next: 'https://evil.example/x' } },
            },
          ],
        }),
      }),
    });

    await readApplePlaylist(host, 'dev', 'gb', 'pl.abcdefgh');

    expect(host.http.fetch).toHaveBeenCalledTimes(1);
  });
});
