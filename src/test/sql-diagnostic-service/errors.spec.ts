import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../util';

describe('error handling', () => {
  describe('invalid columns', () => {
    const results = getDiagnosticFromSourceText(
      "sql`select non_existing from (values('foo')) as t(foo)`;",
    );

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(
      'should return with error: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(typeof diagnostic?.messageText).toEqual('string');
        expect(diagnostic?.messageText).toMatch(/column ".+" does not exist/);
        expect(diagnostic?.category).toEqual(ts.DiagnosticCategory.Error);
      },
    );
  });

  describe('invalid syntax (end of input)', () => {
    const results = getDiagnosticFromSourceText('sql`select id from `;');

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(
      'should return with error: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(typeof diagnostic?.messageText).toEqual('string');
        expect(diagnostic?.messageText).toMatch(/syntax error at end of input/);
        expect(diagnostic?.category).toEqual(ts.DiagnosticCategory.Error);
      },
    );
  });

  describe('invalid syntax (at or near)', () => {
    const results = getDiagnosticFromSourceText('sql`select id from join schema1.table1`;');

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(
      'should return with error: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(typeof diagnostic?.messageText).toEqual('string');
        expect(diagnostic?.messageText).toMatch(/syntax error at or near "(.+)"/);
        expect(diagnostic?.category).toEqual(ts.DiagnosticCategory.Error);
        expect(diagnostic?.start).toBeTruthy();
        expect(diagnostic?.length).toBeTruthy();
      },
    );
  });

  describe('invalid syntax relation', () => {
    const results = getDiagnosticFromSourceText('sql`select id from ab`;');

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(
      'should return with error: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(typeof diagnostic?.messageText).toEqual('string');
        expect(diagnostic?.messageText).toMatch(/relation ".+" does not exist/);
        expect(diagnostic?.category).toEqual(ts.DiagnosticCategory.Error);
        expect(diagnostic?.start).toBeTruthy();
        expect(diagnostic?.length).toBeTruthy();
      },
    );
  });
});
