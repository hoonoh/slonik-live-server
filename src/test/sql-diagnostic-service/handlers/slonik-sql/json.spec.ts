import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../../util';

describe('sql.json', () => {
  describe('should handle json', () => {
    const expected = `select '{"foo":"foo","bar":"bar","baz":{"foo":[1,2,3],"baz":456}}'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${sql.json({
        foo: 'foo',
        bar: 'bar',
        baz: {
          foo: [1, 2, 3],
          baz: 456,
        },
      })}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle strings as json', () => {
    const expected = `select '"str"'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select \${sql.json('str')}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle json from identifier variable', () => {
    const expected = `select '{"foo":"foo","bar":"bar","baz":{"foo":[1,2,3],"baz":456}}'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const json = {
        foo: 'foo',
        bar: 'bar',
        baz: {
          foo: [1, 2, 3],
          baz: 456,
        },
      };
      sql\`select \${sql.json(json)}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle json from function identifier returning string', () => {
    const expected = `select '"str"'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const rtnStr = () => 'str';
      sql\`select \${sql.json(rtnStr())}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle json from function identifier returning number', () => {
    const expected = `select '123'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const rtnNum = () => 123;
      sql\`select \${sql.json(rtnNum())}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle json from function identifier with parenthesized expression', () => {
    const expected = `select '{"foo":"foo","bar":"bar","baz":{"foo":[1,2,3],"baz":456}}'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const getJson = () => ({
        foo: 'foo',
        bar: 'bar',
        baz: {
          foo: [1, 2, 3],
          baz: 456,
        },
      });
      sql\`select \${sql.json(getJson())}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle json from function identifier with return statement block', () => {
    const expected = `select '{"foo":"foo","bar":"bar","baz":{"foo":"fooArr","baz":456}}'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const getJson = () => {
        const fooArr = [1, 2, 3];
        return {
          foo: 'foo',
          bar: 'bar',
          baz: {
            foo: fooArr,
            baz: 456,
          },
        };
      };
      sql\`select \${sql.json(getJson())}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle as expression', () => {
    const expected = `select '{"foo":"foo","bar":"bar","baz":{"foo":[1,2,3],"baz":456}}'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      type Foo = {
        foo: string;
        bar: string;
        baz: {
          foo: number[];
          baz: number;
        };
      };
      sql\`select \${sql.json({
        foo: 'foo',
        bar: 'bar',
        baz: {
          foo: [1, 2, 3],
          baz: 456,
        },
      } as Foo)}::jsonb\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });
  });

  describe('should handle as expression with top node as array literal', () => {
    const expected = `select '[{"foo":"foo","bar":"bar","baz":{"foo":[1,2,3],"baz":456}}]'::jsonb`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      type Foo = {
        foo: string;
        bar: string;
        baz: {
          foo: number[];
          baz: number;
        };
      };
      sql\`select \${sql.json([
        {
          foo: 'foo',
          bar: 'bar',
          baz: {
            foo: [1, 2, 3],
            baz: 456,
          },
        } as Foo,
      ])}::jsonb\`;
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
