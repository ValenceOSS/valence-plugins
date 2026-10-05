import { z } from 'zod';

const PlaylistItemSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    artist: z.string(),
    album: z.string().nullable(),
    releaseId: z.string().nullable(),
  }),
]);

/**
 * One song a kept playlist should hold, in its place: the library's id for it, or the song itself
 * where the library does not have it yet, which Valence shows as missing and fills in once it does.
 */
type PlaylistItem = z.infer<typeof PlaylistItemSchema>;

export type { PlaylistItem };

export { PlaylistItemSchema };
