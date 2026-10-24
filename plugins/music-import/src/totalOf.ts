import type { MusicImportJob } from './MusicImportJob';

/**
 * How many songs an import has in all, kept apart from the songs themselves, which a finished
 * import lets go of.
 *
 * @param job - The import.
 * @returns The number of songs.
 */
const totalOf = (job: MusicImportJob): number => job.total ?? job.tracks.length;

export { totalOf };
