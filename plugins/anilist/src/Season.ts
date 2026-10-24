import { z } from 'zod';

const SeasonSchema = z.object({
  anilistId: z.string(),
  malId: z.string().nullable(),
  episodes: z.number().nullable(),
  titles: z.array(z.string()),
  year: z.number().nullable(),
});

type Season = z.infer<typeof SeasonSchema>;

export type { Season };

export { SeasonSchema };
