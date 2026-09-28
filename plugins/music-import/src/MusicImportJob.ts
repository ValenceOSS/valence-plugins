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
  requested: z.array(z.string()),
  shouldRequest: z.boolean(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

type MusicImportJob = z.infer<typeof MusicImportJobSchema>;

export type { MusicImportJob };

export { MusicImportJobSchema };
