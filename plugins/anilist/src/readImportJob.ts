import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { ImportJob } from './ImportJob';
import { ImportJobSchema } from './ImportJob';
import { jobKeyFor } from './jobKeyFor';

/**
 * Somebody's import, as far as it has got, or nothing where they have not started one.
 *
 * @param valence - The host.
 * @param profileId - Whose import.
 * @returns The import.
 */
const readImportJob = async (
  valence: ValenceHost,
  profileId: string,
): Promise<ImportJob | null> => {
  const read = ImportJobSchema.safeParse(await valence.storage.get(jobKeyFor(profileId)));

  return read.success ? read.data : null;
};

export { readImportJob };
