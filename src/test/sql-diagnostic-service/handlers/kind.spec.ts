import ts from 'typescript/lib/tsserverlibrary';

import { KindHandler } from '../../../lib/sql-diagnostic-service/handlers/kind';
import { Value } from '../../../lib/sql-diagnostic-service/types';

describe('kind handler', () => {
  it('should handle string keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.StringKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'a498110c', isString: true } as Value);
  });

  it('should handle string keyword (raw)', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.StringKeyword, values, true);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'a498110c' } as Value);
  });

  it('should handle number keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.NumberKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: '8408' } as Value);
  });

  it('should handle true keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.TrueKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'true' } as Value);
  });

  it('should handle boolean keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.BooleanKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'true' } as Value);
  });

  it('should handle false keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.FalseKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'false' } as Value);
  });

  it('should handle null keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.NullKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'null' } as Value);
  });

  it('should handle undefined keyword', () => {
    const values: Value[] = [];
    KindHandler.handle(ts.SyntaxKind.UndefinedKeyword, values);
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual({ value: 'null' } as Value);
  });
});
