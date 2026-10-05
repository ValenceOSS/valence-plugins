import type { TraktWatch } from './TraktWatch';

/**
 * How a film or show is named in the list of what the library does not have.
 *
 * @param watch - A play of it.
 * @returns Its title, with its year where Trakt knows it.
 */
const nameOf = (watch: TraktWatch): string => {
  const title = watch.kind === 'film' ? watch : watch.show;

  return title.year === null ? title.title : `${title.title} (${title.year.toString()})`;
};

export { nameOf };
