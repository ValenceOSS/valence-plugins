import type { SurfaceContext } from '@ValenceSDK/host/PluginDefinition';
import type { SurfaceActRequest } from '@ValenceSDK/surface/SurfaceActRequestSchema';
import type { Surface } from '@ValenceSDK/surface/SurfaceSchema';
import { continueMusicImport } from './continueMusicImport';
import type { PlaylistLink } from './readPlaylistLink';
import { readPlaylistLink } from './readPlaylistLink';
import { readSourcePlaylist } from './readSourcePlaylist';
import { renderImport } from './renderImport';
import { startMusicImport } from './startMusicImport';

/**
 * Does what somebody pressed on the import page, then shows it again, with a sentence where it
 * could not be done.
 *
 * @param context - The host and who pressed it.
 * @param request - What they pressed, and the page's fields.
 * @param now - The time now.
 * @returns The page as it now stands.
 */
const actOnImport = async (
  context: SurfaceContext,
  request: SurfaceActRequest,
  now: Date = new Date(),
): Promise<Surface> => {
  const { valence, viewer } = context;

  if (request.action.id === 'continue') {
    await continueMusicImport(valence, viewer.profileId, now);

    return renderImport(context);
  }

  const chosen = request.action.payload?.['playlist'];
  const link: PlaylistLink | null =
    request.action.id === 'import-spotify' && typeof chosen === 'string'
      ? { source: 'spotify', id: chosen }
      : request.action.id === 'import-link'
        ? readPlaylistLink(typeof request.fields['link'] === 'string' ? request.fields['link'] : '')
        : null;

  if (link === null) {
    return renderImport(
      context,
      request.action.id === 'import-link'
        ? 'That is not a Spotify or Apple Music playlist link.'
        : null,
    );
  }

  try {
    const playlist = await readSourcePlaylist(valence, viewer.profileId, link);

    if (typeof playlist === 'string') {
      return renderImport(context, playlist);
    }

    await startMusicImport(
      valence,
      viewer.profileId,
      playlist,
      request.fields['shouldRequest'] !== false,
      now,
    );
    await continueMusicImport(valence, viewer.profileId, now);

    return renderImport(context);
  } catch (failure) {
    valence.log.warn('A playlist could not be read', {
      problem: failure instanceof Error ? failure.message : 'unknown',
    });

    return renderImport(
      context,
      'The playlist could not be read. It may be private, or the service may be busy.',
    );
  }
};

export { actOnImport };
