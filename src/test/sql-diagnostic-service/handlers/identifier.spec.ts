import ts from 'typescript/lib/tsserverlibrary';

import {
  DiagnosticFromFileResult,
  File,
  getDiagnosticFromSourceText,
  getTestTargets,
  mockService,
} from '../../util';

describe('identifier handler', () => {
  describe('should handle no substitution template literal', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      // ts-slonik-plugin-disable
      const foo = sql\`foo\`;
      sql\`select '\${foo}'\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle template expression', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = 'foo';
      // ts-slonik-plugin-disable
      const bar = sql\`\${foo}\`;
      sql\`select \${bar}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle call expression from', () => {
    const expected = `select 'a'`;

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

  describe('should handle property assignment', () => {
    const expected = `select 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      const foo = { bar: 'bar' };
      const bar = () => foo.bar;
      sql\`select '\${raw(foo.bar)}'\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle property access expression', () => {
    const expected = `
        select
        jsonb_set(
          foo,
          '{foo,bar}',
          '"baz"'
        )
        from
        (values('{"foo":{"bar":"bar"}}'::jsonb)) as t(foo)
      `;

    const mainText = `
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      import { Foo } from './foo';
      const foo = new Foo();
      sql\`
        select
        jsonb_set(
          foo,
          '{\${raw(foo.id)},bar}',
          '"baz"'
        )
        from
        (values('{"foo":{"bar":"bar"}}'::jsonb)) as t(foo)
      \`;
    `;

    const fooText = `
      interface IFoo {
        readonly id: string;
      }
      export class Foo implements IFoo {
        readonly id = 'foo';
      }
    `;

    const files: File[] = [
      {
        fileName: 'main.ts',
        path: './main.ts',
        text: mainText,
      },
      {
        fileName: 'foo.ts',
        path: './foo.ts',
        text: fooText,
      },
    ];

    const { languageService, sqlDiagnosticService } = mockService(files);
    const testTargets = getTestTargets(languageService, sqlDiagnosticService, files);
    const results = testTargets.map(
      ([, sourceFile, node], idx) =>
        ['', sqlDiagnosticService.checkSqlNode(sourceFile, node), idx] as DiagnosticFromFileResult,
    );

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle from value type', () => {
    const expected = `select 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo: string = 'foo';
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

  describe('should handle undefined', () => {
    const expected = `select null`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = undefined;
      sql<string>\`select \${foo!}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle string', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = 'foo';
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

  describe('should handle string (raw)', () => {
    const expected = `select foo from (values('bar')) as t(foo) where foo = 'bar'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      import { raw } from 'slonik-sql-tag-raw';
      const foo = 'foo';
      sql\`select \${raw(foo)} from (values('bar')) as t(foo) where \${raw(foo)} = \${'bar'}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle number', () => {
    const expected = `select 123`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = 123;
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

  describe('should handle null', () => {
    const expected = `select null`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = null;
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

  describe('should handle true', () => {
    const expected = `select true`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = true;
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

  describe('should handle false', () => {
    const expected = `select false`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const foo = false;
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

  describe('should handle from parameter', () => {
    const expected = `select 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      (foo: string) => sql<string>\`select \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle from literal-like parameter', () => {
    const expected = `select 'foo'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      (foo: 'foo') => sql\`select \${foo}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle parameter type', () => {
    const expected = `select 'a'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      (foo: string) => sql\`select \${foo}\`;
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
      const foo = !!'foo'.startsWith('foo');
      sql\`select * from (values(true)) as t(foo) where foo = \${foo}\`;
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
