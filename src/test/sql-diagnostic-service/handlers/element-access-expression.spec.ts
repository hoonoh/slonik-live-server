import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('element-access-expression handler', () => {
  describe('should handle element access expression from arrays', () => {
    const expected = `select 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      type Foo<T> = {
        foo: T;
      };
      (foo: Foo<{ bar?: { baz?: string[] } }>) => {
        const baz = foo.foo?.bar?.baz?.[0];
        if (!baz) throw new Error('err');
        sql\`select \${baz}\`;
      };
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
