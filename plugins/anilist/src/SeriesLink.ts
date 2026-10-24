import { z } from 'zod';

const SeriesLinkSchema = z.object({
  entries: z.array(
    z.object({
      anilistId: z.string().nullable(),
      malId: z.string().nullable(),
      title: z.string(),
      offset: z.number(),
      episodes: z.number().nullable(),
    }),
  ),
});

type SeriesLink = z.infer<typeof SeriesLinkSchema>;

export type { SeriesLink };

export { SeriesLinkSchema };
