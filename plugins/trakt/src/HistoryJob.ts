import { z } from 'zod';

const HistoryJobSchema = z.object({
  since: z.string().nullable(),
  until: z.string(),
  page: z.number(),
  pages: z.number().nullable(),
  plays: z.number(),
  matched: z.number(),
  marked: z.number(),
  unmatched: z.array(z.string()),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

type HistoryJob = z.infer<typeof HistoryJobSchema>;

export type { HistoryJob };

export { HistoryJobSchema };
