import { z } from 'zod';
import { ImportedTrackSchema } from './ImportedTrack';

const MusicImportJobSchema = z.object({
  source: z.enum(['spotify', 'apple']),
  name: z.string(),
  tracks: z.array(ImportedTrackSchema),
  next: z.number(),
  playlistId: z.string(),
  found: z.number(),
  missing: z.array(z.string()),
  shouldRequest: z.boolean(),
  isCut: z.boolean().default(false),
  total: z.number().nullable().default(null),
  isStopped: z.boolean().default(false),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

type MusicImportJob = z.infer<typeof MusicImportJobSchema>;

export type { MusicImportJob };

export { MusicImportJobSchema };
