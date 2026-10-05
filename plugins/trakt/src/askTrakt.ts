import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { TraktSession } from './TraktSession';

/**
 * Calls Trakt's API as somebody, with the headers Trakt asks for on every call.
 *
 * @param valence - The host.
 * @param session - Their token and the client id.
 * @param path - The path and query, such as `/sync/history?page=1`.
 * @param body - What to post, where this is a post.
 * @returns The answer, as `valence.http.fetch` gives it.
 */
const askTrakt = (valence: ValenceHost, session: TraktSession, path: string, body?: object) =>
  valence.http.fetch(`https://api.trakt.tv${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      authorization: `Bearer ${session.token}`,
      'trakt-api-key': session.clientId,
      'trakt-api-version': '2',
      'content-type': 'application/json',
      accept: 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

export { askTrakt };
