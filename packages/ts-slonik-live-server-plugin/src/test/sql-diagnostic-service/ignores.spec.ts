import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../util';

describe('ignore handling', () => {
  describe('ignore empty template literal', () => {
    const results = getDiagnosticFromSourceText(`sql\`\`;`);

    it('check results count', () => {
      expect(results.length).toEqual(0);
    });
  });

  describe('ignore querries starting other than allowed', () => {
    const results = getDiagnosticFromSourceText(`
      sql\`user_id = \${userId}\`;
      sql\`order by created_at\`;
      sql\`order by created_at desc\`;
      sql\`limit \${itemsLength + 1}\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(4);
    });

    it.each(results)(
      'should be skipped with reason: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString().startsWith('fragment starting with')).toBeTruthy();
        expect(diagnostic.messageText.toString().endsWith('are not diagnosed')).toBeTruthy();
      },
    );
  });

  describe('should ignore diagnosis via comment', () => {
    const results = getDiagnosticFromSourceText(`
      // ts-slonik-live-server-plugin-disable
      sql\`select from\`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(0);
    });
  });

  describe('should ignore cost errors via comment', () => {
    const results = getDiagnosticFromSourceText(`
      // ts-slonik-live-server-plugin-disable-cost-errors
      sql\`
        select
        table_schema,
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable::bool
        from information_schema.columns
      \`;
    `);

    it('check results count', () => {
      expect(results.length).toEqual(1);
    });

    it.each(results)(
      'diagnosis should be in suggesstion category: `%s`',
      (title: string, diagnostic: ts.Diagnostic) => {
        expect(typeof diagnostic?.messageText).toEqual('string');
        expect(diagnostic?.messageText).toMatch(/explain cost error threshold/);
        expect(diagnostic?.category).toEqual(ts.DiagnosticCategory.Suggestion);
      },
    );
  });
});
