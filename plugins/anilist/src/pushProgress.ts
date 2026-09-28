import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { connectedLists } from './connectedLists';
import { EpisodeLinkSchema } from './EpisodeLink';
import { episodeKeyFor } from './episodeKeyFor';
import { readPreferences } from './readPreferences';
import { saveProgress } from './saveProgress';

/**
 * When somebody finishes an episode, tells each list they have connected how far through the show
 * they now are, if they asked for that and the episode is one an import matched.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns How many lists were told.
 */
const pushProgress = async (valence: ValenceHost, event: PluginEvent): Promise<number> => {
  if (event.topic !== 'playback.finished' || event.profileId === null || event.mediaId === null) {
    return 0;
  }

  const link = EpisodeLinkSchema.safeParse(
    await valence.storage.get(episodeKeyFor(event.profileId, event.mediaId)),
  );

  if (!link.success || !(await readPreferences(valence, event.profileId)).twoWay) {
    return 0;
  }

  let told = 0;

  for (const { provider, token } of await connectedLists(valence, event.profileId)) {
    const id = provider === 'anilist' ? link.data.anilistId : link.data.malId;

    if (id !== null) {
      await saveProgress(valence, provider, token, id, link.data.number, link.data.episodes);
      told += 1;
    }
  }

  return told;
};

export { pushProgress };
