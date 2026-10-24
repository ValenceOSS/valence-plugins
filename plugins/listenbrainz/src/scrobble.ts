import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { actOnOutcome } from './actOnOutcome';
import { isScrobbled } from './isScrobbled';
import { listenFor } from './listenFor';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import { readPreferences } from './readPreferences';
import { sendScrobbles } from './sendScrobbles';
import { sendToLastfm } from './sendToLastfm';
import { sendToListenBrainz } from './sendToListenBrainz';
import type { Service } from './Service';

/**
 * When somebody starts a song, tells each service they connected it is playing now; when they stop
 * one, scrobbles it to each if they played enough of it, by the services' own rule rather than
 * Valence's for having watched something to the end. What is playing now matters only now, so it is
 * sent once and never kept to try again.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns The services told.
 */
const scrobble = async (valence: ValenceHost, event: PluginEvent): Promise<Service[]> => {
  const isPlayingNow = event.topic === 'playback.started';

  if ((!isPlayingNow && event.topic !== 'playback.stopped') || event.profileId === null) {
    return [];
  }

  const { profileId } = event;
  const links = await readLinks(valence, profileId);
  const keys = await readLastfmKeys(valence);
  const services: Service[] = [
    ...(links.listenbrainz === null ? [] : ['listenbrainz' as const]),
    ...(links.lastfm === null || keys === null ? [] : ['lastfm' as const]),
  ];

  if (services.length === 0 || !(await readPreferences(valence, profileId)).scrobble) {
    return [];
  }

  const listen = await listenFor(valence, event);

  if (listen === null) {
    return [];
  }

  if (!isPlayingNow) {
    if (!isScrobbled(listen, event.positionSeconds ?? 0)) {
      return [];
    }

    await sendScrobbles(
      valence,
      profileId,
      services.map((service) => ({ service, listen })),
    );

    return services;
  }

  const [toListenBrainz, toLastfm] = await Promise.all([
    links.listenbrainz === null
      ? null
      : sendToListenBrainz(valence, links.listenbrainz, [listen], true),
    links.lastfm === null || keys === null
      ? null
      : sendToLastfm(valence, keys, links.lastfm, [listen], true).then((each) => each[0] ?? null),
  ]);

  if (toListenBrainz !== null) {
    await actOnOutcome(valence, profileId, 'listenbrainz', toListenBrainz);
  }

  if (toLastfm !== null) {
    await actOnOutcome(valence, profileId, 'lastfm', toLastfm);
  }

  return services;
};

export { scrobble };
