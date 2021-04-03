import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.identifier', () => {
  describe('should handle identifier', () => {
    const expected = 'select id from "schema1"."table1"';

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select id from \${sql.identifier(['schema1', 'table1'])}\`;
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
