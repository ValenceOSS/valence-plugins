import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { MusicImportJob } from './MusicImportJob';
import { MusicImportJobSchema } from './MusicImportJob';
import { jobKeyFor } from './jobKeyFor';

/**
 * Somebody's playlist import, as far as it has got, or nothing where they have not started one.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @returns The import.
 */
const readMusicImportJob = async (
  valence: ValenceHost,
  profileId: string,
): Promise<MusicImportJob | null> => {
  const read = MusicImportJobSchema.safeParse(await valence.storage.get(jobKeyFor(profileId)));

  return read.success ? read.data : null;
};

export { readMusicImportJob };
