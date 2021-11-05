import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.binary', () => {
  describe('should handle binary', () => {
    const expected = "select (''::bytea)";

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select (\${sql.binary(Buffer.from('abc'))})\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });
});
