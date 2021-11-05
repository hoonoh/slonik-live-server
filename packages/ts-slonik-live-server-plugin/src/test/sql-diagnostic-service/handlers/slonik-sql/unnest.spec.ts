import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.unnest', () => {
  describe('should handle unnest', () => {
    const expected = `select bar, baz from unnest(array[]::int4[], array[]::text[]) AS foo(bar, baz)
  `;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`
        select bar, baz from \${sql.unnest(
          [
            [1, 'foo'],
            [2, 'bar'],
          ],
          ['int4', 'text'],
        )} AS foo(bar, baz)
      \`;
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
