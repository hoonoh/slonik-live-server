import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';

export class KindHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('kind');

  static handle(kind: ts.SyntaxKind, values: Value[], isRaw = false) {
    if (kind === ts.SyntaxKind.NumberKeyword) {
      KindHandler.debugHandled('number');
      values.push({ value: '1' });
    } else if (kind === ts.SyntaxKind.StringKeyword) {
      KindHandler.debugHandled('string');
      values.push({ value: 'a', isString: isRaw ? undefined : true });
    } else if (kind === ts.SyntaxKind.TrueKeyword) {
      KindHandler.debugHandled('true');
      values.push({ value: 'true' });
    } else if (kind === ts.SyntaxKind.FalseKeyword) {
      KindHandler.debugHandled('false');
      values.push({ value: 'false' });
    } /* istanbul ignore else */ else if (
      kind === ts.SyntaxKind.NullKeyword ||
      kind === ts.SyntaxKind.UndefinedKeyword
    ) {
      KindHandler.debugHandled('null');
      values.push({ value: 'null' });
    }
  }
}
