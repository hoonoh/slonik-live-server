import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('call-expression handler', () => {
  describe('should handle function', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      function foo() {
        return 'foo';
      }
      sql\`select \${foo()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle call expression', () => {
    const expected = `select 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = 'fooBar'.replace('Bar', '');
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

  describe('should handle call expression from identifier', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = () => 'foo';
      const fooRes = foo();
      sql\`select \${fooRes}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle method signature', () => {
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

  describe('should handle method declaration', () => {
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

  describe('should handle type by flag', () => {
    const expected = `select 8408`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = parseInt('123', 10);
      sql\`select \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.messageText.toString()).toContain(expected);
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
    });
  });
});
