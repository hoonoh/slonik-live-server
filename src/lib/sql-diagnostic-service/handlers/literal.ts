import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';

export class LiteralHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('literal');

  static getValueFromLiteral(literal: ts.LiteralExpression, isRaw = false) {
    if (ts.isStringLiteral(literal)) {
      return { value: literal.text, isString: isRaw ? undefined : true };
    }
    return { value: literal.text };
  }

  static handle(literal: ts.LiteralExpression, values: Value[], isRaw = false) {
    if (ts.isStringLiteral(literal)) {
      LiteralHandler.debugHandled('string');
    } else {
      LiteralHandler.debugHandled('number or others');
    }
    values.push(LiteralHandler.getValueFromLiteral(literal, isRaw));
  }
}
