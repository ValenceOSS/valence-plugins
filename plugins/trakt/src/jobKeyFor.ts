import type { JobKind } from './JobKind';

/**
 * Where somebody's import or daily sync is kept in the plugin's storage.
 *
 * @param kind - Which of the two.
 * @param profileId - Whose.
 * @returns The storage key.
 */
const jobKeyFor = (kind: JobKind, profileId: string): string => `${kind}:${profileId}`;

export { jobKeyFor };
