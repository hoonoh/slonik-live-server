import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('binary-expression handler', () => {
  describe('should handle property access expression', () => {
    const expected = `select * from (values('bar')) as t(bar) where bar = 'baz'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        fooVal = 'foo';
      }
      class Bar {
        barVal = 'bar';
      }
      class Baz {
        bazVal = 'baz';
      }
      const foo = new Foo();
      const bar = new Bar();
      const baz = new Baz();
      const fooBarBaz = foo.fooVal || bar.barVal || baz.bazVal;
      sql\`select * from (values('bar')) as t(bar) where bar = \${fooBarBaz}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle literal expression', () => {
    const expected = `select * from (values('bar')) as t(bar) where bar = 'baz'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select * from (values('bar')) as t(bar) where bar = \${'foo' || 'bar' || 'baz'}\`;
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
    const expected = `select * from (values('bar')) as t(bar) where bar = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = () => 'foo';
      const bar = () => 'bar';
      sql\`select * from (values('bar')) as t(bar) where bar = \${foo() || bar()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle by type', () => {
    const expected = `select * from (values('bar')) as t(bar) where bar = 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = () => 'foo';
      const bar = () => 'bar';
      let baz: string | undefined;
      sql\`select * from (values('bar')) as t(bar) where bar = \${foo() || bar() || baz}\`;
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
