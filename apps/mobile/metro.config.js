const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const resolvePackage = (pkgName) => {
  const local = path.resolve(projectRoot, 'node_modules', pkgName);
  if (fs.existsSync(local)) return local;
  return path.resolve(monorepoRoot, 'node_modules', pkgName);
};

/**
 * Metro configuration for Monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: {
      'react-native': resolvePackage('react-native'),
      'react': resolvePackage('react'),
      '@safora/shared-types': path.resolve(monorepoRoot, 'packages/shared-types/src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

