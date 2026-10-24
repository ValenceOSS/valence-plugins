import type { z } from 'zod';

/**
 * Reads text as JSON through a schema, without trusting it to be either.
 *
 * @param text - The text, such as an answer's body.
 * @param schema - What it should be.
 * @returns What it holds, or nothing where it isn't JSON or isn't that.
 */
const jsonOf = <Shape extends z.ZodType>(text: string, schema: Shape): z.infer<Shape> | null => {
  try {
    const read = schema.safeParse(JSON.parse(text));

    return read.success ? read.data : null;
  } catch {
    return null;
  }
};

export { jsonOf };
