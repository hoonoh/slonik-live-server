import ts from 'typescript/lib/tsserverlibrary';

import { LiteralHandler } from '../../../lib/sql-diagnostic-service/handlers/literal';
import { Value } from '../../../lib/sql-diagnostic-service/types';

describe('literal handler', () => {
  it('should handle string literal', () => {
    const literal = {
      kind: ts.SyntaxKind.StringLiteral,
      text: 'foo',
    } as ts.StringLiteral;
    const values: Value[] = [];
    LiteralHandler.handle(literal, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'foo', isString: true } as Value);
  });

  it('should handle string literal (raw)', () => {
    const literal = {
      kind: ts.SyntaxKind.StringLiteral,
      text: 'foo',
    } as ts.StringLiteral;
    const values: Value[] = [];
    LiteralHandler.handle(literal, values, true);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'foo' } as Value);
  });

  it('should handle number literal', () => {
    const literal = {
      kind: ts.SyntaxKind.NumericLiteral,
      text: '123',
    } as ts.NumericLiteral;
    const values: Value[] = [];
    LiteralHandler.handle(literal, values, true);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: '123' } as Value);
  });
});
