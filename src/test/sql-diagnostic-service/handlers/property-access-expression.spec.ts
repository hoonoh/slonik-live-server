import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('property-access-expression handler', () => {
  describe('should handle by initializer literal expression', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        bar = 'bar';
      }
      const makeFoo = () => new Foo();
      const foo = makeFoo();
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

  describe('should handle by value declaration type', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo {
        bar: string;
      }
      const makeFoo = () => new Foo();
      const foo = makeFoo();
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

  describe('should handle from template span', () => {
    const expected = `select 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = { bar: 'bar' };
      sql\`select \${foo.bar}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle property signature union', () => {
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a'`;

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
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a'`;

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
    const expected = `select foo from (values('foo')) as t(foo) where foo = 'a'`;

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
});
