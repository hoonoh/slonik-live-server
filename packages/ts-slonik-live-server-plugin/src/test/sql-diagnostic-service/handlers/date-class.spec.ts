import MockDate from 'mockdate';
import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../../util';

describe('date-class handler', () => {
  describe('should handle date class method from identifier', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      const date = new Date();
      sql\`select * from (values(now())) as t(date) where date = \${date.toISOString()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle date class method from identifier, from new expression', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select * from (values(now())) as t(date) where date = \${new Date().toISOString()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle method of class extending Date class', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Timestamp extends Date {
        getTimeStamp() {
          return this.getTime();
        }
      }
      const timestamp = new Timestamp();
      sql\`select * from (values(now())) as t(date) where date = \${timestamp.toISOString()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle method of class having Date as base class', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo extends Date {
        foo() {
          return 'foo';
        }
      }
      class Bar extends Foo {
        bar() {
          return 'bar';
        }
      }
      const bar = new Bar();
      sql\`select * from (values(now())) as t(date) where date = \${bar.toISOString()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle method of class extending Date class, from new expression', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Timestamp extends Date {
        getTimeStamp() {
          return this.getTime();
        }
      }
      sql\`select * from (values(now())) as t(date) where date = \${new Timestamp().toISOString()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle return values as number', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select to_timestamp(${Date.now()}/1000)`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select to_timestamp(\${new Date().getTime()}/1000)\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle Date.now()', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select to_timestamp(${Date.now()}/1000)`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      sql\`select to_timestamp(\${Date.now()}/1000)\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });

  describe('should handle fallbacks if not Date class method', () => {
    const date = new Date();
    MockDate.set(date);

    const expected = `select * from (values(now())) as t(date) where date = '${date.toISOString()}'`;

    const results = getDiagnosticFromSourceText(`
      import { sql } from 'slonik';
      class Foo extends Date {
        foo() {
          return '${date.toISOString()}';
        }
      }
      sql\`select * from (values(now())) as t(date) where date = \${new Foo().foo()}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
      expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
      expect(diagnostic.messageText.toString()).toContain(expected);
    });

    MockDate.reset();
  });
});
