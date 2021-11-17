import { readFileSync, renameSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const packageJsonPath = resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath).toString());
renameSync(packageJsonPath, packageJsonPath + '.backup');
writeFileSync(
  packageJsonPath,
  JSON.stringify(
    {
      ...packageJson,
      types: undefined,
      scripts: undefined,
      jest: undefined,
    },
    null,
    2,
  ),
);
