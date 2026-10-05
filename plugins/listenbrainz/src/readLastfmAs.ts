import type { z } from 'zod';
import type { ValenceHost } from '@ValenceSDK/host/ValenceHost';
import { askLastfm } from './askLastfm';
import { LastfmError } from './LastfmError';
import type { LastfmKeys } from './LastfmKeys';

/**
 * Calls Last.fm and reads its answer through a schema, refusing one that is not what it should be.
 *
 * @param valence - The host.
 * @param keys - The plugin's API key and shared secret.
 * @param call - The method, its parameters, and whether it is signed.
 * @param schema - What the answer should be.
 * @returns The checked answer.
 */
const readLastfmAs = async <Shape extends z.ZodType>(
  valence: ValenceHost,
  keys: LastfmKeys,
  call: { method: string; params: Record<string, string>; isSigned: boolean },
  schema: Shape,
): Promise<z.infer<Shape>> => {
  const read = schema.safeParse(
    await askLastfm(valence, keys, call.method, call.params, call.isSigned),
  );

  if (!read.success) {
    throw new LastfmError(0, 'Last.fm sent something unexpected');
  }

  return read.data;
};

export { readLastfmAs };
