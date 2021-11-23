import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('enum-member handler', () => {
  describe('should handle enum member', () => {
    const expected = `select * from (values('foo')) as t(foo) where foo = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      enum Foo {
        foo,
        bar = 'bar',
        baz = 0,
      }
      const foo = Foo.bar;
      sql\`select * from (values('foo')) as t(foo) where foo = \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle enum member with fallback', () => {
    const expected = `select * from (values('foo')) as t(foo) where foo = 'a3840cba'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      enum Foo {
        foo,
        bar = 'bar',
        baz = 0,
      }
      const foo = Foo.foo;
      sql\`select * from (values('foo')) as t(foo) where foo = \${foo}\`;
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
