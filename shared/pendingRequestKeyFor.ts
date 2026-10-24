import { PENDING_REQUESTS } from './PENDING_REQUESTS';

/**
 * Where a playlist whose missing albums are still to be requested is remembered.
 *
 * @param profileId - Whose playlist.
 * @param playlistId - The Valence playlist.
 * @returns The storage key.
 */
const pendingRequestKeyFor = (profileId: string, playlistId: string): string =>
  `${PENDING_REQUESTS}${profileId}:${playlistId}`;

export { pendingRequestKeyFor };
