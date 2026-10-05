import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';

/**
 * Whether the administrator chose to have kept playlists' missing albums requested. It is off
 * unless they turn it on, since a weekly playlist of new songs could otherwise request dozens of
 * albums every week.
 *
 * @param valence - The host.
 * @returns Whether to request them.
 */
const readShouldRequest = async (valence: ValenceHost): Promise<boolean> =>
  (await valence.settings.read())['requestMissingAlbums'] === true;

export { readShouldRequest };
