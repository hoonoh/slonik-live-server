import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../types';

export class TypeByFlagHandler {
  static handle(type: ts.Type, values: Value[], isRaw = false) {
    if (type.isStringLiteral()) {
      values.push({ value: type.value, isString: isRaw ? undefined : true } as Value);
    } else if (type.isLiteral()) {
      values.push({ value: type.value } as Value);
    } else {
      const allFlags = Object.keys(ts.TypeFlags)
        .map(k => ts.TypeFlags[k as keyof typeof ts.TypeFlags])
        .filter(v => typeof v === 'number') as number[];
      // eslint-disable-next-line no-bitwise
      const matchedFlags = allFlags.filter(f => (f & type.flags) !== 0);
      const flagNames = matchedFlags
        .filter(f => matchedFlags.includes(f))
        .map(f => ts.TypeFlags[f]);

      if (flagNames.includes('String')) {
        values.push({ value: 'a', isString: isRaw ? undefined : true } as Value);
      } else if (flagNames.includes('Number')) {
        values.push({ value: '1' } as Value);
      } else if (flagNames.includes('Boolean')) {
        values.push({ value: 'true' } as Value);
      } /* istanbul ignore else */ else if (
        flagNames.includes('Null') ||
        flagNames.includes('Undefined')
      ) {
        values.push({ value: 'null' } as Value);
      }
    }
  }
}
