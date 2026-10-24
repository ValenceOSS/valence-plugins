import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isSamePayload } from '@Shared/isSamePayload';
import { PACKAGE_NAME } from './PACKAGE_NAME';
import { releasedPackage } from './releasedPackage';
import { releasedTags } from './releasedTags';

const tags = releasedTags();

const unbumped = readdirSync('packages')
  .filter((file) => file.endsWith('.vplugin'))
  .filter((file) => {
    const groups = PACKAGE_NAME.exec(file)?.groups;
    const tag = `${groups?.['id'] ?? ''}-v${groups?.['version'] ?? ''}`;

    return (
      tags.includes(tag) &&
      !isSamePayload(releasedPackage(tag, file), readFileSync(join('packages', file)))
    );
  });

if (unbumped.length > 0) {
  process.stderr.write(
    `These plugins changed since their version was released, and the release refuses them until each one's version is bumped:\n${unbumped.map((file) => `- ${file}`).join('\n')}\n`,
  );
  process.exit(1);
}

process.stdout.write('Every changed plugin has a new version.\n');
