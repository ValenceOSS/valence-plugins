import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { askTrakt } from './askTrakt';
import { historyBodyFor } from './historyBodyFor';
import { readPreferences } from './readPreferences';
import { traktSessionFor } from './traktSessionFor';

/**
 * When somebody finishes a film or an episode, adds it to their Trakt history at the time they
 * finished, if they have Trakt connected and have not turned this off. For anybody with Trakt
 * connected, each film or episode they finish is logged with what became of it, sent or why not, so
 * an operator can tell where a watch went. Songs and books are none of Trakt's business, and pass
 * without a word.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns Whether Trakt was told.
 */
const pushWatch = async (valence: ValenceHost, event: PluginEvent): Promise<boolean> => {
  if (event.topic !== 'playback.finished' || event.profileId === null || event.mediaId === null) {
    return false;
  }

  const session = await traktSessionFor(valence, event.profileId);

  if (session === null) {
    return false;
  }

  const about = { profile: event.profileId, media: event.mediaId };

  if (!(await readPreferences(valence, event.profileId)).twoWay) {
    valence.log.info('Did not send a finish to Trakt: sending is turned off', about);

    return false;
  }

  const media = await valence.library.get(event.mediaId);

  if (media !== null && media.kind !== 'film' && media.kind !== 'episode') {
    return false;
  }

  const body = media === null ? null : await historyBodyFor(valence, media, event.occurredAt);

  if (body === null) {
    valence.log.info('Did not send a finish to Trakt: not a film or a numbered episode', {
      ...about,
      kind: media?.kind ?? 'not in the library',
    });

    return false;
  }

  const answer = await askTrakt(valence, session, '/sync/history', body);

  if (answer.status < 200 || answer.status >= 300) {
    throw new Error(`Trakt answered ${answer.status.toString()}`);
  }

  valence.log.info('Added a finished watch to Trakt', {
    ...about,
    kind: media?.kind ?? 'unknown',
    answer: answer.text.slice(0, 300),
  });

  return true;
};

export { pushWatch };
