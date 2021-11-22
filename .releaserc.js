const path = require('path');
const process = require('process');

const packageName = process.cwd().split(path.sep).pop();

let config;

if (packageName === 'ts-slonik-live-server-plugin') {
  console.log('loading config for', packageName);
  config = {
    extends: 'semantic-release-monorepo',
    branches: ['main', { name: 'preview', prerelease: true }, { name: 'alpha', prerelease: true }],
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/changelog',
      '@semantic-release/npm',
      '@semantic-release/github',
      [
        '@semantic-release/git',
        {
          assets: ['package.json', 'CHANGELOG.md'],
          message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        },
      ],
    ],
  };
} else if (packageName === 'vscode-slonik-live-server') {
  console.log('loading config for', packageName);
  config = {
    extends: 'semantic-release-monorepo',
    branches: ['main'],
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/changelog',
      [
        'semantic-release-vsce',
        {
          packageVsix: true,
        },
      ],
      [
        '@semantic-release/github',
        {
          path: './*.vsix',
        },
      ],
      [
        '@semantic-release/git',
        {
          assets: ['package.json', 'CHANGELOG.md'],
          message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        },
      ],
    ],
  };
} else {
  console.log(`\npackage ${packageName} is not listed for semantic-release, exiting\n\n`);
  process.exit(1);
}

module.exports = config;
