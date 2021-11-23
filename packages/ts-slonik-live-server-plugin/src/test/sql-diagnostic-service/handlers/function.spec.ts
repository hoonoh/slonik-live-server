import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('function handler', () => {
  describe('should handle function from method declaration', () => {
    const expected = `select * from (values('bar')) as t(bar) where bar = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        getBar() {
          return 'bar';
        }
      }
      sql\`select * from (values('bar')) as t(bar) where bar = \${new Foo().getBar()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle function from method signature', () => {
    const expected = `select * from (values('bar')) as t(foo) where foo = 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select * from (values('bar')) as t(foo) where foo = \${new Array(['bar']).join('')}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle handle function by method return body', () => {
    const expected = `select 123`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const getFoo = () => 123;
      sql\`select \${getFoo()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle handle function by method return body as no substitution template literal', () => {
    const expected = `select '123'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const getFoo = () => \`123\`;
      sql\`select \${getFoo()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle handle function by method return body as no substitution template literal (raw)', () => {
    const expected = `select * from (values('bar')) as t(foo) where foo = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      const foo = () => \`foo\`;
      sql\`select * from (values('bar')) as t(foo) where \${raw(foo())} = 'bar'\`;
    `);

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle handle function by method return body as template expression', () => {
    const expected = `select 'abcb30b7'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const getFoo = (foo: number) => \`\${foo}\`;
      sql\`select \${getFoo(12345)}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle handle function by method return body as template expression (raw)', () => {
    const expected = `select * from (values('bar')) as t(ae4b8363) where ae4b8363 = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      const foo = () => \`\${'foo'}\`;
      sql\`select * from (values('bar')) as t(ae4b8363) where \${raw(foo())} = 'bar'\`;
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
