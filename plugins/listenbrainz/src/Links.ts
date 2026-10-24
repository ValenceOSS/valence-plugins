import { z } from 'zod';

const ListenBrainzLinkSchema = z.object({ token: z.string(), user: z.string() });

const LastfmLinkSchema = z.object({ sessionKey: z.string(), user: z.string() });

const StoredLinkSchema = z.object({
  user: z.string(),
  token: z.string().optional(),
  sessionKey: z.string().optional(),
});

const LastfmSignInSchema = z.object({ token: z.string(), startedAt: z.string() });

type ListenBrainzLink = z.infer<typeof ListenBrainzLinkSchema>;

type LastfmLink = z.infer<typeof LastfmLinkSchema>;

type LastfmSignIn = z.infer<typeof LastfmSignInSchema>;

/** The services somebody has connected, each as the plugin keeps it. */
type Links = { listenbrainz: ListenBrainzLink | null; lastfm: LastfmLink | null };

export type { LastfmLink, LastfmSignIn, Links, ListenBrainzLink };

export { LastfmLinkSchema, LastfmSignInSchema, ListenBrainzLinkSchema, StoredLinkSchema };
