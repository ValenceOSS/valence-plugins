import type { Plugin } from 'esbuild';
import { SDK_SOURCE } from './SDK_SOURCE';

/**
 * Resolves the SDK's `@ValenceSDK/*` imports to its source, wherever they are imported from. esbuild
 * applies tsconfig paths only to a project's own files, and the SDK's modules import each other
 * through that alias from inside `node_modules`.
 *
 * @returns The esbuild plugin.
 */
const valenceSdkAlias = (): Plugin => ({
  name: 'valence-sdk-alias',
  setup: (build) => {
    build.onResolve({ filter: /^@ValenceSDK\// }, (args) => ({
      path: `${SDK_SOURCE}/${args.path.slice('@ValenceSDK/'.length)}.ts`,
    }));
  },
});

export { valenceSdkAlias };
