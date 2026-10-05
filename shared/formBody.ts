/**
 * Encodes fields as an `application/x-www-form-urlencoded` body, without `URLSearchParams`, which a
 * plugin's sandbox does not have.
 *
 * @param fields - The fields.
 * @returns The body.
 */
const formBody = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(
      ([name, value]) =>
        `${encodeURIComponent(name).replaceAll('%20', '+')}=${encodeURIComponent(value).replaceAll('%20', '+')}`,
    )
    .join('&');

export { formBody };
