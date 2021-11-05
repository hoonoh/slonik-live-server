import ts from 'typescript/lib/tsserverlibrary';

import { getDiagnosticFromSourceText } from '../util';

describe('diagnostic service', () => {
  describe('should handle sql template literal from parameters', () => {
    describe('without default values', () => {
      const results = getDiagnosticFromSourceText(`
        (
          fg1: TaggedTemplateLiteralInvocationType<QueryResultRowType>,
          fg2: TaggedTemplateLiteralInvocationType<QueryResultRowType>,
        ) => {
          sql\`select 1 where true \${fg1} \${fg2}\`;
        };
      `);
      it('check results count', () => {
        expect(results.length).toEqual(1);
      });
      it('should return expected', () => {
        expect(results[0][1].category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(results[0][1].messageText.toString().startsWith('explain cost is ok')).toBeTruthy();
        expect(results[0][1].messageText.toString().endsWith(`select 1 where true  `)).toBeTruthy();
      });
    });

    describe('should handle default values', () => {
      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        (fg1 = sql\`and true=true\`, fg2 = sql\`and false=false\`) => {
          sql\`select 1 where true \${fg1} \${fg2}\`;
        };
      `);
      it('check results count', () => {
        expect(results.length).toEqual(3);
      });
      it.each(results)('returns %s', (title: string, diagnostic: ts.Diagnostic, idx: number) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        if (idx < 2) {
          expect(
            diagnostic.messageText.toString().startsWith('fragment starting with'),
          ).toBeTruthy();
          expect(diagnostic.messageText.toString().endsWith('are not diagnosed')).toBeTruthy();
        } else {
          expect(
            diagnostic.messageText
              .toString()
              .includes('select 1 where true and true=true and false=false'),
          ).toBeTruthy();
        }
      });
    });
  });

  describe('should handle unexpected type errors', () => {
    describe('uuid', () => {
      const expected = `select * from (values('00000000-0000-0000-0000-000000000000'::uuid)) as t(id) where id = '00000000-0000-0000-0000-000000000000'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const id: string;
        sql\`select * from (values('00000000-0000-0000-0000-000000000000'::uuid)) as t(id) where id = \${id}\`;
      `);

      it('check results count', () => {
        expect(results.length).toEqual(1);
      });

      it.each(results)(`returns \`${expected}\``, (title: string, diagnostic: ts.Diagnostic) => {
        expect(diagnostic.category).toEqual(ts.DiagnosticCategory.Suggestion);
        expect(diagnostic.messageText.toString()).toContain(expected);
      });
    });

    describe('inet', () => {
      const expected = `select * from (values('0.0.0.0'::inet)) as t(id) where id = '0.0.0.0'`;

      const results = getDiagnosticFromSourceText(`
        import { sql } from 'slonik';
        const id: string;
        sql\`select * from (values('0.0.0.0'::inet)) as t(id) where id = \${id}\`;
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
});
