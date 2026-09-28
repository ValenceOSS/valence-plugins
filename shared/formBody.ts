/**
 * Encodes fields as an `application/x-www-form-urlencoded` body.
 *
 * @param fields - The fields.
 * @returns The body.
 */
const formBody = (fields: Record<string, string>): string => new URLSearchParams(fields).toString();

export { formBody };
