import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('element-access-expression handler', () => {
  describe('should handle element access expression from arrays', () => {
    const expected = `select 'a498110c'`;

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

  describe('should handle template expression array partially', () => {
    const expected = `select 1 where true `;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = [sql\`where true\`];
      foo.push(sql\`and 1 = 1\`);
      sql\`select 1 \${foo[0]} \${foo[1]}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(3);
    });

    it.each(results)(
      `returns \`${expected}\``,
      (title: string, diagnostic: ts.Diagnostic, idx: number) => {
        if (idx === 0) {
          expect(diagnostic.messageText.toString()).toContain(
            'fragment starting with `where` are not diagnosed',
          );
          expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        } else if (idx === 1) {
          expect(diagnostic.messageText.toString()).toContain(
            'fragment starting with `and` are not diagnosed',
          );
          expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        } else if (idx === 2) {
          expect(diagnostic.messageText.toString()).toContain(expected);
          expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        }
      },
    );
  });
});
