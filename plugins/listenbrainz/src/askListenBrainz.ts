import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

/**
 * Calls ListenBrainz's API, naming Valence in the user agent as ListenBrainz asks, and as
 * somebody where their token is given.
 *
 * @param valence - The host.
 * @param path - The path and query, such as `/1/validate-token`.
 * @param options - Their token, and what to post where this is a post.
 * @returns The answer, as `valence.http.fetch` gives it.
 */
const askListenBrainz = (
  valence: ValenceHost,
  path: string,
  options: { token?: string; body?: object } = {},
) =>
  valence.http.fetch(`https://api.listenbrainz.org${path}`, {
    method: options.body === undefined ? 'GET' : 'POST',
    headers: {
      accept: 'application/json',
      'user-agent': `Valence/${valence.plugin.version} ( https://github.com/ValenceOSS/Valence )`,
      ...(options.token === undefined ? {} : { authorization: `Token ${options.token}` }),
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

export { askListenBrainz };
