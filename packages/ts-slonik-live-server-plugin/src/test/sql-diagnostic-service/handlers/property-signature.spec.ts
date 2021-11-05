import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('property-access-expression handler', () => {
  describe('should handle property signature union', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      interface Foo {
        bar: string | undefined;
      }
      const foo: Foo = { bar: 'bar' };
      sql\`select foo from (values('foo')) as t(foo) where foo = \${foo.bar}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle property signature intersection', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      interface Foo {
        bar: string & undefined;
      }
      const foo: Foo = { bar: 'bar' };
      sql\`select foo from (values('foo')) as t(foo) where foo = \${foo.bar}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle property signature type', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a498110c'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      interface Foo {
        bar: string;
      }
      const foo: Foo = { bar: 'bar' };
      sql\`select foo from (values('foo')) as t(foo) where foo = \${foo.bar}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle property signature union #2', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      type Type =
        | {
            type: 'foo';
            foo: string;
          }
        | {
            type: 'bar';
            bar: string;
          }
        | {
            type: 'baz';
            baz: string;
          };
      (() => {
        let foo: Type | undefined;
        if (!foo) return;
        sql\`select \${foo.type}\`;
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
});
