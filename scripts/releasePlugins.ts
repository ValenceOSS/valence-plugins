import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGE = /^(?<id>.+)-(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\.vplugin$/u;

const TOOL = join('.tools', 'valence-plugin.mjs');

/**
 * Whether a release already exists for a tag.
 *
 * @param tag - The tag, such as `anilist-v1.0.0`.
 * @returns Whether it exists.
 */
const isReleased = (tag: string): boolean => {
  try {
    execFileSync('gh', ['release', 'view', tag], { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
};

for (const file of readdirSync('packages').filter((name) => name.endsWith('.vplugin'))) {
  const match = PACKAGE.exec(file);
  const id = match?.groups?.['id'];
  const version = match?.groups?.['version'];

  if (id === undefined || version === undefined) {
    throw new Error(`${file} is not named <id>-<version>.vplugin`);
  }

  const tag = `${id}-v${version}`;
  const path = join('packages', file);

  if (isReleased(tag)) {
    rmSync(path);
    execFileSync('gh', ['release', 'download', tag, '--pattern', file, '--dir', 'packages'], {
      stdio: 'inherit',
    });
    process.stdout.write(
      `${tag} is already released; the catalogue lists the published package.\n`,
    );

    continue;
  }

  execFileSync('node', [TOOL, 'sign', path], { stdio: 'inherit' });
  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      path,
      `${path}.sig`,
      '--title',
      `${id} ${version}`,
      '--notes',
      `Signed package for ${id} ${version}.`,
    ],
    { stdio: 'inherit' },
  );
  process.stdout.write(`Released ${tag}.\n`);
}
