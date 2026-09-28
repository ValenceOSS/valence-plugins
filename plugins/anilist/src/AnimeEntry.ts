import { z } from 'zod';

const AnimeEntrySchema = z.object({
  provider: z.enum(['anilist', 'mal']),
  id: z.string(),
  anilistId: z.string().nullable(),
  malId: z.string().nullable(),
  titles: z.array(z.string()),
  year: z.number().nullable(),
  progress: z.number(),
  episodes: z.number().nullable(),
  status: z.enum(['watching', 'completed', 'planning', 'paused', 'dropped', 'repeating']),
});

type AnimeEntry = z.infer<typeof AnimeEntrySchema>;

export type { AnimeEntry };

export { AnimeEntrySchema };
