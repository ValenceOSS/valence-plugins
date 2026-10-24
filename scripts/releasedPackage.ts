import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Fetches the package a release published, for comparing with a fresh build or listing again.
 *
 * @param tag - The release tag, such as `anilist-v1.0.1`.
 * @param file - The package's file name.
 * @returns The published package.
 */
const releasedPackage = (tag: string, file: string): Buffer => {
  const into = mkdtempSync(join(tmpdir(), 'released-'));

  try {
    execFileSync('gh', ['release', 'download', tag, '--pattern', file, '--dir', into], {
      stdio: 'inherit',
    });

    return readFileSync(join(into, file));
  } catch (cause) {
    throw new Error(`Could not download ${file} from the ${tag} release.`, { cause });
  } finally {
    rmSync(into, { recursive: true, force: true });
  }
};

export { releasedPackage };
