type Answer = { status: number; text: string };

type Track = { title: string; creator: string; album?: string; artists?: string[] };

const TOKEN = '0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0';

/**
 * A playlist ListenBrainz has made for somebody, as it lists them.
 *
 * @param patch - Which kind, such as `weekly-jams`.
 * @param id - The playlist's id.
 * @returns The listing entry.
 */
const aMadeForPlaylist = (patch: string, id: string) => ({
  playlist: {
    identifier: `https://listenbrainz.org/playlist/${id}`,
    title: `${patch} for marques`,
    extension: {
      'https://musicbrainz.org/doc/jspf#playlist': {
        additional_metadata: { algorithm_metadata: { source_patch: patch } },
        created_for: 'marques',
      },
    },
    track: [],
  },
});

/**
 * ListenBrainz answering for somebody whose token is `TOKEN`, for tests: who the token is, the
 * playlists made for them with their songs, and every listen accepted, or answered with the
 * status a test gives.
 *
 * @param playlists - Each playlist made for them by id, newest first, with its kind and songs.
 * @param submitStatus - What submitting a listen answers.
 * @param refusals - Whether the token is still valid, and what a refused listen says.
 * @returns A web that answers ListenBrainz.
 */
const listenBrainzAnswers =
  (
    playlists: { id: string; patch: string; tracks: Track[] }[] = [],
    submitStatus = 200,
    refusals: { isTokenValid?: boolean; error?: string } = {},
  ) =>
  (url: string, init: { headers?: Record<string, string> }): Answer => {
    const path = /^https:\/\/api\.listenbrainz\.org([^?]*)/u.exec(url)?.[1];
    const isMine =
      init.headers?.['authorization'] === `Token ${TOKEN}` && refusals.isTokenValid !== false;

    if (path === '/1/validate-token') {
      return {
        status: 200,
        text: JSON.stringify(
          isMine
            ? { code: 200, message: 'Token valid.', valid: true, user_name: 'marques' }
            : { code: 200, message: 'Token invalid.', valid: false },
        ),
      };
    }

    if (path === '/1/submit-listens') {
      return submitStatus === 200
        ? { status: 200, text: JSON.stringify({ status: 'ok' }) }
        : {
            status: submitStatus,
            text: JSON.stringify({ code: submitStatus, error: refusals.error ?? 'No.' }),
          };
    }

    if (path === '/1/user/marques/playlists/createdfor') {
      return {
        status: 200,
        text: JSON.stringify({
          playlists: playlists.map((each) => aMadeForPlaylist(each.patch, each.id)),
          playlist_count: playlists.length,
        }),
      };
    }

    const playlist = playlists.find((each) => path === `/1/playlist/${each.id}`);

    if (playlist !== undefined) {
      return {
        status: 200,
        text: JSON.stringify({
          playlist: {
            title: playlist.patch,
            track: playlist.tracks.map((track) => ({
              identifier: [
                'https://musicbrainz.org/recording/8f3471b5-7e6a-48da-86a9-c1c07a0f47ae',
              ],
              title: track.title,
              creator: track.creator,
              ...(track.album === undefined ? {} : { album: track.album }),
              duration: 200_000,
              extension: {
                'https://musicbrainz.org/doc/jspf#track': {
                  additional_metadata: {
                    artists: (track.artists ?? [track.creator]).map((name) => ({
                      artist_credit_name: name,
                      join_phrase: '',
                    })),
                  },
                },
              },
            })),
          },
        }),
      };
    }

    return { status: 404, text: '' };
  };

export { listenBrainzAnswers, TOKEN };
