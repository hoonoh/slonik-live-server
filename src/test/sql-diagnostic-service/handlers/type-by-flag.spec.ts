import ts from 'typescript/lib/tsserverlibrary';

import { TypeByFlagHandler } from '../../../lib/sql-diagnostic-service/handlers/type-by-flag';
import { Value } from '../../../lib/sql-diagnostic-service/types';

const mockType = (flags: ts.TypeFlags, isLiteral?: 'string' | 'number', value?: string) => {
  const type = {
    flags,
    isLiteral: () => !!isLiteral,
    isStringLiteral: () => isLiteral === 'string',
    isNumberLiteral: () => isLiteral === 'number',
  } as ts.Type;

  if (isLiteral === 'string' && value) {
    return { ...type, value } as ts.StringLiteralType;
  }
  if (isLiteral === 'number' && value) {
    return ({ ...type, value } as unknown) as ts.NumberLiteralType;
  }
  return type;
};

describe('type-by-flag handler', () => {
  describe('should handle string literal type', () => {
    const type = mockType(ts.TypeFlags.String, 'string', 'foo');
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return string value', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: 'foo', isString: true } as Value);
    });
  });

  describe('should handle number literal type', () => {
    const type = mockType(ts.TypeFlags.Number, 'number', '123');
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return number', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: '123' } as Value);
    });
  });

  describe('should handle string type', () => {
    const type = mockType(ts.TypeFlags.String);
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return string value', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: 'a', isString: true } as Value);
    });
  });

  describe('should handle number type', () => {
    const type = mockType(ts.TypeFlags.Number);
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return number', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: '1' } as Value);
    });
  });

  describe('should handle boolean type', () => {
    const type = mockType(ts.TypeFlags.Boolean);
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return boolean', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: 'true' } as Value);
    });
  });

  describe('should handle null type', () => {
    const type = mockType(ts.TypeFlags.Null);
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return null', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: 'null' } as Value);
    });
  });

  describe('should handle undefined type', () => {
    const type = mockType(ts.TypeFlags.Undefined);
    const values: Value[] = [];
    TypeByFlagHandler.handle(type, values);

    it('should return null', () => {
      expect(values.length).toEqual(1);
      expect(values[0]).toEqual({ value: 'null' } as Value);
    });
  });
});
