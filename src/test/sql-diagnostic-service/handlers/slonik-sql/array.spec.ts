import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.array', () => {
  describe('should handle number arrays', () => {
    const expected = 'select (array[1, 2, 3]::int4[])';

    const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        sql\`select (\${sql.array([1, 2, 3], 'int4')})\`;
      `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string arrays', () => {
    const expected = "select (array['a', 'b', 'c']::text[])";

    const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        sql\`select (\${sql.array(['a', 'b', 'c'], 'text')})\`;
      `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string arrays from identifier', () => {
    const expected = `select (array['a', 'b', 'c']::text[])`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = ['a', 'b', 'c'];
      const bar = 'text';
      sql\`select (\${sql.array(foo, bar)})\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle member type', () => {
    const expected = `select array[1, 2, 3]::int[]`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${sql.array([1, 2, 3], sql\`int[]\`)}\`;
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
