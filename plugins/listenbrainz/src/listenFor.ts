import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { Listen } from './Listen';

/**
 * The song a playback event is about, as a listen, worked back to when it started from how far
 * it got.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns The listen, or nothing where it is not a song with an artist.
 */
const listenFor = async (valence: ValenceHost, event: PluginEvent): Promise<Listen | null> => {
  if (event.mediaId === null) {
    return null;
  }

  const media = await valence.library.get(event.mediaId);

  if (media === null || media.kind !== 'track' || media.artist === null || media.artist === '') {
    return null;
  }

  const durationSeconds = event.durationSeconds ?? media.durationSeconds;

  return {
    title: media.title,
    artist: media.artist,
    album: media.album,
    durationSeconds: durationSeconds === null ? null : Math.round(durationSeconds),
    startedAt: Math.floor(Date.parse(event.occurredAt) / 1000 - (event.positionSeconds ?? 0)),
  };
};

export { listenFor };
