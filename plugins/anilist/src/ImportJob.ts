import { z } from 'zod';
import { AnimeEntrySchema } from './AnimeEntry';

const ImportJobSchema = z.object({
  entries: z.array(AnimeEntrySchema),
  next: z.number(),
  matched: z.number(),
  marked: z.number(),
  unmatched: z.array(z.string()),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

type ImportJob = z.infer<typeof ImportJobSchema>;

export type { ImportJob };

export { ImportJobSchema };
