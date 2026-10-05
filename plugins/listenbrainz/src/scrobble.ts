import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { actOnOutcome } from './actOnOutcome';
import { listenFor } from './listenFor';
import { readLastfmKeys } from './readLastfmKeys';
import { readLinks } from './readLinks';
import { readPreferences } from './readPreferences';
import { sendScrobbles } from './sendScrobbles';
import { sendToLastfm } from './sendToLastfm';
import { sendToListenBrainz } from './sendToListenBrainz';
import type { Service } from './Service';

/**
 * When somebody starts a song, tells each service they connected it is playing now; when they
 * finish one, scrobbles it to each. Valence counts a song finished at nine tenths of the way
 * through, past what either service asks. What is playing now matters only now, so it is sent once
 * and never kept to try again.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns The services told.
 */
const scrobble = async (valence: ValenceHost, event: PluginEvent): Promise<Service[]> => {
  const isPlayingNow = event.topic === 'playback.started';

  if ((!isPlayingNow && event.topic !== 'playback.finished') || event.profileId === null) {
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
    await sendScrobbles(
      valence,
      profileId,
      services.map((service) => ({ service, listen })),
    );

    return services;
  }

  const outcomes = await Promise.all([
    links.listenbrainz === null
      ? null
      : sendToListenBrainz(valence, links.listenbrainz, listen, true),
    links.lastfm === null || keys === null
      ? null
      : sendToLastfm(valence, keys, links.lastfm, listen, true),
  ]);

  if (outcomes[0] !== null) {
    await actOnOutcome(valence, profileId, 'listenbrainz', outcomes[0]);
  }

  if (outcomes[1] !== null) {
    await actOnOutcome(valence, profileId, 'lastfm', outcomes[1]);
  }

  return services;
};

export { scrobble };
