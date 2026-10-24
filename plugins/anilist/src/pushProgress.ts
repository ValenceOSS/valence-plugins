import type { PluginEvent } from '@ValenceSDK/host/PluginDefinition';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { connectedLists } from './connectedLists';
import { linkKeyFor } from './linkKeyFor';
import { positionsOf } from './positionsOf';
import { readPreferences } from './readPreferences';
import { saveProgress } from './saveProgress';
import { SeriesLinkSchema } from './SeriesLink';

/**
 * When somebody finishes an episode of a programme their import matched, tells each list they have
 * connected, on the entry for that episode's season, that they watched it, if they asked for that.
 * Each list is read first, so progress only rises.
 *
 * @param valence - The host.
 * @param event - What happened.
 * @returns How many lists were changed.
 */
const pushProgress = async (valence: ValenceHost, event: PluginEvent): Promise<number> => {
  if (event.topic !== 'playback.finished' || event.profileId === null || event.mediaId === null) {
    return 0;
  }

  const { profileId, mediaId } = event;

  if (!(await readPreferences(valence, profileId)).twoWay) {
    return 0;
  }

  const episode = await valence.library.get(mediaId);

  if (episode?.kind !== 'episode' || episode.seriesId === null) {
    return 0;
  }

  const link = SeriesLinkSchema.safeParse(
    await valence.storage.get(linkKeyFor(profileId, episode.seriesId)),
  );

  if (!link.success) {
    return 0;
  }

  const at = positionsOf(await valence.library.episodes(episode.seriesId)).at.get(mediaId) ?? -1;
  const entry = [...link.data.entries]
    .reverse()
    .find(
      (each) => at >= each.offset && (each.episodes === null || at < each.offset + each.episodes),
    );

  if (at < 0 || entry === undefined) {
    return 0;
  }

  let changed = 0;

  for (const { provider, token } of await connectedLists(valence, profileId)) {
    const id = provider === 'anilist' ? entry.anilistId : entry.malId;

    if (
      id !== null &&
      (await saveProgress(valence, provider, token, id, at - entry.offset + 1, entry.episodes))
    ) {
      changed += 1;
    }
  }

  return changed;
};

export { pushProgress };
