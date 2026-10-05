import { z } from 'zod';

const PreferencesSchema = z.object({ twoWay: z.boolean() });

type Preferences = z.infer<typeof PreferencesSchema>;

export type { Preferences };

export { PreferencesSchema };
