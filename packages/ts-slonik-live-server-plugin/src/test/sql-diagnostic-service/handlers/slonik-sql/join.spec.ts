import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.join', () => {
  describe('should join boolean expressions', () => {
    const expected = 'select 123 where true and true';

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select 123 where \${sql.join([true, true], sql\` and \`)}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should join tuples', () => {
    const expected = 'select (1, 2)';

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select (\${sql.join([1, 2], sql\`, \`)})\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should join tuple list', () => {
    const expected = 'select (1, 2), (3, 4)';

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`
        select \${sql.join(
          [
            sql\`(\${sql.join([1, 2], sql\`, \`)})\`,
            sql\`(\${sql.join([3, 4], sql\`, \`)})\`,
          ],
          sql\`, \`
        )}
      \`
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
