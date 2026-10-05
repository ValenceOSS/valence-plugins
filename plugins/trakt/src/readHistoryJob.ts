import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import type { HistoryJob } from './HistoryJob';
import { HistoryJobSchema } from './HistoryJob';
import type { JobKind } from './JobKind';
import { jobKeyFor } from './jobKeyFor';

/**
 * Somebody's import or daily sync, as far as it has got, or nothing where none was started.
 *
 * @param valence - The host.
 * @param kind - Which of the two.
 * @param profileId - Whose.
 * @returns The job.
 */
const readHistoryJob = async (
  valence: ValenceHost,
  kind: JobKind,
  profileId: string,
): Promise<HistoryJob | null> => {
  const read = HistoryJobSchema.safeParse(await valence.storage.get(jobKeyFor(kind, profileId)));

  return read.success ? read.data : null;
};

export { readHistoryJob };
