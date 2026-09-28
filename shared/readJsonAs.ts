import type { z } from 'zod';

type Response = { status: number; text: string };

/**
 * Reads a JSON answer through a schema, refusing an answer that failed or that is not what the
 * schema describes, so nothing another service sends is trusted before it has been checked.
 *
 * @param response - The answer, as `valence.http.fetch` gives it.
 * @param schema - What the answer should be.
 * @param service - Who answered, for the message when it fails.
 * @returns The checked answer.
 */
const readJsonAs = <Shape extends z.ZodType>(
  response: Response,
  schema: Shape,
  service: string,
): z.infer<Shape> => {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${service} answered ${response.status.toString()}`);
  }

  const read = schema.safeParse(JSON.parse(response.text));

  if (!read.success) {
    throw new Error(`${service} sent something unexpected`);
  }

  return read.data;
};

export { readJsonAs };
