import { z } from 'zod';

const PreferencesSchema = z.object({
  scrobble: z.boolean(),
  keep: z.array(z.string()),
});

type Preferences = z.infer<typeof PreferencesSchema>;

export type { Preferences };

export { PreferencesSchema };
