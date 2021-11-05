import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { generatePlaceholder } from '../../util';
import { Value } from '../types';

export class TypeByFlagHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('type by flag');

  static getFlagNames(type: ts.Type) {
    const allFlags = Object.keys(ts.TypeFlags)
      .map(k => ts.TypeFlags[k as keyof typeof ts.TypeFlags])
      .filter(v => typeof v === 'number') as number[];
    // eslint-disable-next-line no-bitwise
    const matchedFlags = allFlags.filter(f => (f & type.flags) !== 0);
    return matchedFlags.filter(f => matchedFlags.includes(f)).map(f => ts.TypeFlags[f]);
  }

  static handlable(type: ts.Type) {
    const flagNames = TypeByFlagHandler.getFlagNames(type);
    return (
      type.isStringLiteral() ||
      type.isLiteral() ||
      flagNames.includes('String') ||
      flagNames.includes('Number') ||
      flagNames.includes('Boolean') ||
      flagNames.includes('Null') ||
      flagNames.includes('Undefined')
    );
  }

  static handle(type: ts.Type, values: Value[], isRaw = false) {
    let handled = false;

    if (type.isUnionOrIntersection()) {
      const handlableByTypeflag = type.types.find(t => TypeByFlagHandler.handlable(t));
      /* istanbul ignore else */
      if (handlableByTypeflag) {
        handled = true;
        TypeByFlagHandler.debugHandled('union or intersection');
        TypeByFlagHandler.handle(handlableByTypeflag, values, isRaw);
      }
    }

    if (!handled) {
      if (type.isStringLiteral()) {
        TypeByFlagHandler.debugHandled('string literal');
        values.push({ value: type.value, isString: isRaw ? undefined : true });
      } else if (type.isLiteral()) {
        TypeByFlagHandler.debugHandled('literal');
        values.push({ value: typeof type.value === 'string' ? type.value : type.value.toString() });
      } else {
        const flagNames = TypeByFlagHandler.getFlagNames(type);

        if (flagNames.includes('String')) {
          TypeByFlagHandler.debugHandled('string');
          values.push({ value: generatePlaceholder(values), isString: isRaw ? undefined : true });
        } else if (flagNames.includes('Number')) {
          TypeByFlagHandler.debugHandled('number');
          values.push({ value: generatePlaceholder(values, undefined, true) });
        } else if (flagNames.includes('Boolean')) {
          TypeByFlagHandler.debugHandled('boolean');
          values.push({ value: 'true' });
        } /* istanbul ignore else */ else if (
          flagNames.includes('Null') ||
          flagNames.includes('Undefined')
        ) {
          TypeByFlagHandler.debugHandled('null or undefined');
          values.push({ value: 'null' });
        }
      }
    }
  }
}
