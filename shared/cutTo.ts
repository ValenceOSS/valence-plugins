/**
 * Shortens text to fit a limit the host enforces, ending in an ellipsis where it was cut.
 *
 * @param text - The text.
 * @param most - The most characters it may have.
 * @returns The text, at most `most` characters long.
 */
const cutTo = (text: string, most: number): string =>
  text.length <= most ? text : `${text.slice(0, most - 1).trimEnd()}…`;

export { cutTo };
