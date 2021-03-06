import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('primitive handler', () => {
  describe('should handle string literal', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${'foo'}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string literal as raw', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      sql\`select foo from (values('foo')) as t(foo) where \${raw('foo')} = 'foo'\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string keyword', () => {
    const expected = `select 'a74a206b'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo: string;
      sql\`select \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string keyword as raw', () => {
    const expected = `select a52af533 from (values('foo')) as t(a52af533) where a52af533 = 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      const foo: string;
      sql\`select a52af533 from (values('foo')) as t(a52af533) where \${raw(foo)} = 'foo'\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.messageText.toString()).toContain(expected);
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
    });
  });

  describe('should handle numberic literal', () => {
    const expected = `select 123`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${123}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle union types', () => {
    const expected = `select 'ad9317d8'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      (() => {
        let foo: string | undefined;
        if (!foo) return;
        sql\`select \${foo}\`;
      })();
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle number keyword', () => {
    const expected = `select 29713`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo: number;
      sql\`select \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle undefined', () => {
    const expected = `select null`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo: undefined;
      sql\`select \${foo!}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle true keyword', () => {
    const expected = `select true`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${true}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle false keyword', () => {
    const expected = `select false`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${false}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle null keyword', () => {
    const expected = `select null`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${null}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  // PrimitiveHandler.handleWithStringReturn should be covered with sql.array
});
