import { renameSync } from 'fs';
import { resolve } from 'path';

const packageJsonPath = resolve(__dirname, '../../package.json');
renameSync(packageJsonPath + '.backup', packageJsonPath);
