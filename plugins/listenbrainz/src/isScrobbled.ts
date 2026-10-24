import type { Listen } from './Listen';

/** Played this long, a song counts whatever its length. */
const LONG_ENOUGH_SECONDS = 240;

/**
 * Whether a song stopped where it was played counts as listened to, by the rule Last.fm and
 * ListenBrainz share: played for half its length or four minutes, whichever comes first. A song of
 * unknown length counts at four minutes. Last.fm's own floor of 30 seconds is `sendToLastfm`'s.
 *
 * @param listen - The song.
 * @param playedSeconds - How far into it it stopped.
 * @returns Whether to scrobble it.
 */
const isScrobbled = (listen: Listen, playedSeconds: number): boolean =>
  listen.durationSeconds === null
    ? playedSeconds >= LONG_ENOUGH_SECONDS
    : playedSeconds >= Math.min(listen.durationSeconds / 2, LONG_ENOUGH_SECONDS);

export { isScrobbled };
