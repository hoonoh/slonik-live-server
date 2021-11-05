/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { generatePlaceholder } from '../../util';
import { Value } from '../types';
import { LiteralHandler } from './literal';

export class EnumMemberHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('enum member');

  static handle(node: ts.EnumMember, values: Value[], isRaw = false) {
    if (node.initializer && ts.isLiteralExpression(node.initializer)) {
      EnumMemberHandler.debugHandled('literal');
      LiteralHandler.handle(node.initializer, values, isRaw);
    } /* istanbul ignore else */ else {
      EnumMemberHandler.debugHandled('fallback as string');
      values.push({
        value: generatePlaceholder(values, node),
        isString: !isRaw ? true : undefined,
      });
    }
  }
}
