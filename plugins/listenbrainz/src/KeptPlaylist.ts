import { z } from 'zod';

const KeptPlaylistSchema = z.object({
  playlistId: z.string(),
  version: z.string(),
  entryIds: z.array(z.string()),
  found: z.number(),
  total: z.number(),
  checkedAt: z.string(),
  updatedAt: z.string(),
});

/**
 * A Valence playlist kept in step with a service's: which it is, the version of the service's it
 * holds, and the entries the plugin put in it, so a person's own additions are left alone.
 */
type KeptPlaylist = z.infer<typeof KeptPlaylistSchema>;

export type { KeptPlaylist };

export { KeptPlaylistSchema };
