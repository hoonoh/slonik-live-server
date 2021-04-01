import chalk from 'chalk';
import { resolve } from 'path';

import { getFiles, getTestTargets, mockService } from '../util';

const files = getFiles([resolve(__dirname, './target-src.ts')]);
const { languageService, sqlDiagnosticService } = mockService(files);
const testTargets = getTestTargets(languageService, sqlDiagnosticService, files);

testTargets.forEach(target => {
  const [, sourceFile, node] = target;
  const diagnostic = sqlDiagnosticService.checkSqlNode(sourceFile, node);

  const logWithHeader = (
    header: string,
    body?: string,
    bodyColor = '#fff',
    headerColor = `#4287f5`,
  ) => {
    const headChalk = chalk.hex(headerColor);
    const bodyChalk = chalk.hex(bodyColor);
    console.log(headChalk('#####'));
    console.log(headChalk(`##### ${header}:`));
    console.log(headChalk('#####'));
    console.log(bodyChalk(body));
    console.log(headChalk('#####[END]\n'));
  };

  if (process.env.NODE_ENV !== 'dev') {
    logWithHeader('clean source text', sourceFile.getText(), '#777');
  }

  if (process.env.NODE_ENV !== 'dev') {
    logWithHeader('diagnostic messageText', diagnostic?.messageText.toString(), '#777');
  }

  const sourceTextEscaped = sourceFile
    .getText()
    .replace(new RegExp(/`/, 'g'), '\\`')
    .replace(new RegExp(/\$/, 'g'), '\\$');

  const sourceTextForTestBody = `    ${sourceTextEscaped
    .split('\n')
    .filter(t => t.trim() !== '')
    .join('\n    ')
    .replace(new RegExp('\\s+$', 's'), '')}\n  `;

  const expected = diagnostic?.messageText
    .toString()
    .replace(/^explain cost is ok: \d{1,}.\d{1,}[\n\s]+tested with query:[\n\s]+/, '');

  if (process.env.NODE_ENV !== 'dev') {
    logWithHeader('source text escaped', sourceTextEscaped, '#777');
  }

  if (process.env.NODE_ENV !== 'dev') {
    logWithHeader('expected render target', expected, '#777');
  }

  const testBody = `import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('should handle UPDATE_SUBJECT', () => { // ! UPDATE_SUBJECT
  const expected = \`${expected}\`;

  const results = getDiagnosticFromSourceText(\`\n${sourceTextForTestBody}\`);

  it('check results count', () => {
    expect(results.length).toEqual(1);
  });

  it.each(results)(\`returns \\\`\${expected}\\\`\`, (title: string, diagnostic: ts.Diagnostic) => {
    expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
    expect(diagnostic.messageText.toString()).toContain(expected);
    // ! ADDITIONAL_EXPECTS
  });
});
`;

  logWithHeader('generated test body', testBody);
});
