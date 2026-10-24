import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isSamePayload } from '@Shared/isSamePayload';
import { PACKAGE_NAME } from './PACKAGE_NAME';
import { releasedPackage } from './releasedPackage';
import { releasedTags } from './releasedTags';

const TOOL = join('.tools', 'valence-plugin.mjs');

const tags = releasedTags();

const built = readdirSync('packages')
  .filter((file) => file.endsWith('.vplugin'))
  .map((file) => {
    const groups = PACKAGE_NAME.exec(file)?.groups;
    const id = groups?.['id'];
    const version = groups?.['version'];

    if (id === undefined || version === undefined) {
      throw new Error(`${file} is not named <id>-<version>.vplugin`);
    }

    const tag = `${id}-v${version}`;
    const path = join('packages', file);

    return {
      id,
      version,
      tag,
      path,
      released: tags.includes(tag) ? releasedPackage(tag, file) : null,
    };
  });

const changed = built.filter(
  ({ path, released }) => released !== null && !isSamePayload(released, readFileSync(path)),
);

if (changed.length > 0) {
  throw new Error(
    `${changed.map(({ tag }) => tag).join(', ')} changed since released. Bump each one's version so the change ships.`,
  );
}

for (const { id, version, tag, path, released } of built) {
  if (released === null) {
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
    rmSync(`${path}.sig`);
    process.stdout.write(`Released ${tag}.\n`);
  } else {
    writeFileSync(path, released);
    process.stdout.write(
      `${tag} is already released; the catalogue lists the published package.\n`,
    );
  }

  for (const earlier of tags.filter((each) => each.startsWith(`${id}-v`) && each !== tag)) {
    const earlierFile = `${id}-${earlier.slice(id.length + 2)}.vplugin`;

    if (PACKAGE_NAME.test(earlierFile)) {
      writeFileSync(join('packages', earlierFile), releasedPackage(earlier, earlierFile));
      process.stdout.write(`${earlier} is listed as an earlier version.\n`);
    }
  }
}
