/**
 * Where a finish Trakt hasn't taken yet waits to be sent again, one key each, oldest first. Without
 * a finish, the start every one of somebody's keys shares.
 *
 * @param profileId - Whose.
 * @param push - What was finished, and when.
 * @returns The storage key, or the start of all of them.
 */
const pushKeyFor = (profileId: string, push?: { mediaId: string; watchedAt: string }): string =>
  push === undefined ? `push:${profileId}:` : `push:${profileId}:${push.watchedAt}:${push.mediaId}`;

export { pushKeyFor };
