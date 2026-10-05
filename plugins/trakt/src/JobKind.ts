/**
 * Which of somebody's two reads of their history a job is: the whole of it, which they start, or
 * the daily look for plays added since, which the schedule starts.
 */
type JobKind = 'import' | 'sync';

export type { JobKind };
