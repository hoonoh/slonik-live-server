import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';

export class KindHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('kind');

  static handle(kind: ts.SyntaxKind, values: Value[], initializer?: ts.Expression, isRaw = false) {
    if (kind === ts.SyntaxKind.NumberKeyword || kind === ts.SyntaxKind.NumericLiteral) {
      KindHandler.debugHandled('number');
      const value = initializer && ts.isNumericLiteral(initializer) ? initializer.text : '1';
      values.push({ value });
    } else if (kind === ts.SyntaxKind.StringKeyword || kind === ts.SyntaxKind.StringLiteral) {
      KindHandler.debugHandled('string');
      const value = initializer && ts.isStringLiteral(initializer) ? initializer.text : 'a';
      values.push({ value, isString: isRaw ? undefined : true });
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
