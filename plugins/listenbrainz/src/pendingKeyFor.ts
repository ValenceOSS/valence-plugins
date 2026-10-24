import { md5 } from '@Shared/md5';
import type { Listen } from './Listen';
import type { Service } from './Service';

/**
 * Where a scrobble waiting to be sent is kept, one key each, so two runs never overwrite each
 * other's: by whose, which service, when the song started, which also orders them oldest first,
 * and which song, so two started in the same second keep apart. Without a scrobble, the start every
 * one of somebody's keys shares.
 *
 * @param profileId - Whose.
 * @param scrobble - Which service, and the song.
 * @returns The storage key, or the start of all of them.
 */
const pendingKeyFor = (
  profileId: string,
  scrobble?: { service: Service; listen: Listen },
): string =>
  scrobble === undefined
    ? `pending:${profileId}:`
    : [
        `pending:${profileId}`,
        scrobble.service,
        scrobble.listen.startedAt.toString().padStart(12, '0'),
        md5(`${scrobble.listen.artist}\n${scrobble.listen.title}`).slice(0, 8),
      ].join(':');

export { pendingKeyFor };
