import { execFileSync } from 'node:child_process';

/**
 * Lists the tags of every published release, leaving out drafts a failed release may have left.
 *
 * @returns Tags such as `anilist-v1.0.1`.
 */
const releasedTags = (): string[] =>
  execFileSync(
    'gh',
    [
      'release',
      'list',
      '--exclude-drafts',
      '--limit',
      '1000',
      '--json',
      'tagName',
      '--jq',
      '.[].tagName',
    ],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter((tag) => tag !== '');

export { releasedTags };
