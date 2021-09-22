import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { generatePlaceholder } from '../../util';
import { Value } from '../types';

export class KindHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('kind');

  static handle(kind: ts.SyntaxKind, values: Value[], isRaw = false) {
    if (kind === ts.SyntaxKind.NumberKeyword) {
      KindHandler.debugHandled('number');
      values.push({ value: generatePlaceholder(values, undefined, true) });
    } else if (kind === ts.SyntaxKind.StringKeyword) {
      KindHandler.debugHandled('string');
      values.push({ value: generatePlaceholder(values), isString: isRaw ? undefined : true });
    } else if (kind === ts.SyntaxKind.TrueKeyword || kind === ts.SyntaxKind.BooleanKeyword) {
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
