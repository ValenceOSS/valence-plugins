import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { askLastfm } from './askLastfm';
import { LastfmError } from './LastfmError';
import type { LastfmKeys } from './LastfmKeys';
import type { Listen } from './Listen';
import type { LastfmLink } from './Links';
import type { SendOutcome } from './SendOutcome';

/** Last.fm scrobbles nothing of 30 seconds or less. */
const SHORTEST_SECONDS = 30;

/**
 * Sends a listen to somebody's Last.fm, as a scrobble or as playing now.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param link - Their Last.fm connection.
 * @param listen - The song.
 * @param isPlayingNow - Whether it has only started.
 * @returns How it went.
 */
const sendToLastfm = async (
  valence: ValenceHost,
  keys: LastfmKeys,
  link: LastfmLink,
  listen: Listen,
  isPlayingNow: boolean,
): Promise<SendOutcome> => {
  if (
    !isPlayingNow &&
    listen.durationSeconds !== null &&
    listen.durationSeconds <= SHORTEST_SECONDS
  ) {
    return {
      kind: 'refused',
      reason: 'Last.fm takes no song of 30 seconds or less',
      isTheirs: false,
    };
  }

  try {
    await askLastfm(
      valence,
      keys,
      isPlayingNow ? 'track.updateNowPlaying' : 'track.scrobble',
      {
        artist: listen.artist,
        track: listen.title,
        sk: link.sessionKey,
        ...(listen.album === null ? {} : { album: listen.album }),
        ...(listen.durationSeconds === null ? {} : { duration: listen.durationSeconds.toString() }),
        ...(isPlayingNow ? {} : { timestamp: listen.startedAt.toString() }),
      },
      true,
    );

    return { kind: 'sent' };
  } catch (failure) {
    if (!(failure instanceof LastfmError)) {
      throw failure;
    }

    return failure.isSignedOut
      ? { kind: 'signedOut' }
      : failure.isBusy
        ? { kind: 'busy' }
        : { kind: 'refused', reason: failure.message, isTheirs: false };
  }
};

export { sendToLastfm };
