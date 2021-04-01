import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';

export class LiteralHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('literal');

  static handle(literal: ts.LiteralExpression, values: Value[], isRaw = false) {
    if (ts.isStringLiteral(literal)) {
      LiteralHandler.debugHandled('string');
      values.push({ value: literal.text, isString: isRaw ? undefined : true });
    } else {
      LiteralHandler.debugHandled('number or others');
      values.push({ value: literal.text });
    }
  }
}
