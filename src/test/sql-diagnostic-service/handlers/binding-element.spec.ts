import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('property-access-expression handler', () => {
  describe('should handle enum member', () => {
    const expected = `select * from (values('foo')) as t(foo) where foo = 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      enum Foo {
        foo = 'foo',
        bar = 'bar',
        baz = 0,
      }
      const { foo } = Foo;
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

  describe('should handle enum member', () => {
    const expected = `select * from (values('foo')) as t(foo) where foo = 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        foo = 'foo';
      }
      const { foo } = new Foo();
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
