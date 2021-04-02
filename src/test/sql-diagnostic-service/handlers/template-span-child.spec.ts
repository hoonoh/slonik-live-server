import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('template-span-child handler', () => {
  describe('should handle arrays from element access expression', () => {
    describe('string array', () => {
      const expected = `select * from (values('foo','bar')) as t(foo, bar) where foo = 'bar'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        import { raw } from 'slonik-sql-tag-raw';
        const foo = ['foo', 'bar'];
        sql\`select * from (values('foo','bar')) as t(foo, bar) where \${raw(foo[0])} = \${foo[1]}\`;
      `);

      it('check results count', () => {
        expect(results.length).toEqual(1);
      });

      it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString()).toContain(expected);
      });
    });

    describe('number array', () => {
      const expected = `select * from (values(123)) as t(foo) where foo = 123`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const foo = [123, 456];
        sql\`select * from (values(123)) as t(foo) where foo = \${foo[0]}\`;
      `);

      it('check results count', () => {
        expect(results.length).toEqual(1);
      });

      it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString()).toContain(expected);
      });
    });

    describe('boolean array', () => {
      const expected = `select * from (values(true)) as t(foo) where foo = false`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const foo = [true, false];
        sql\`select * from (values(true)) as t(foo) where foo = \${foo[1]}\`;
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

  describe('should handle conditional expression', () => {
    describe('whenTrue = string', () => {
      const expected = `select 'foo'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const foo = 'foo';
        const bar = 'bar';
        sql\`select \${true ? 'foo' : 'bar'}\`;
      `);

      it('check results count', () => {
        expect(results.length).toEqual(1);
      });

      it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString()).toContain(expected);
      });
    });

    describe('whenTrue = identifier', () => {
      const expected = `select 'foo'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const foo = 'foo';
        const bar = 'bar';
        sql\`select \${true ? foo : bar}\`;
      `);

      it('check results count', () => {
        expect(results.length).toEqual(1);
      });

      it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString()).toContain(expected);
      });
    });

    describe('whenTrue = sql fragment', () => {
      const expected = `select 'foo'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        sql\`select \${true ? sql\`\${'foo'}\` : sql\`\${'bar'}\`}\`;
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

  describe('should handle as expression', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      type Foo = { bar: 'foo' | 'bar' };
      sql\`select '\${raw('foo' as Foo['bar'])}'\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle element access expression', () => {
    const expected = `select 'baz'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        readonly bar = 'baz';
      }
      const foo = new Foo();
      sql\`select \${foo['bar']}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle prefix unary expression', () => {
    const expected = `select * from (values(true)) as t(foo) where foo = true`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = 'foo'.startsWith('foo');
      sql\`select * from (values(true)) as t(foo) where foo = \${!foo}\`;
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
