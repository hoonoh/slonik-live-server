/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { generatePlaceholder } from '../../util';
import { Value } from '../types';

export class PrimitiveHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('element access expression');

  static handle(node: ts.Node | ts.Expression, values: Value[], isRaw = false) {
    if (ts.isStringLiteral(node)) {
      this.debugHandled('string literal');
      values.push({ value: node.text, isString: isRaw ? undefined : true });
    } else if (ts.isNumericLiteral(node)) {
      this.debugHandled('numeric literal');
      values.push({ value: node.text });
    } else if (ts.isUnionTypeNode(node)) {
      this.debugHandled('union type');
      const subValues: Value[] = [];
      node.types.forEach(type => {
        LanguageServiceLogger.debugGroupStart();
        if (subValues.length === 0) PrimitiveHandler.handle(type, subValues, isRaw);
        LanguageServiceLogger.debugGroupEnd();
      });
      if (subValues.length) values.push(...subValues);
    } else if (node.kind === ts.SyntaxKind.StringKeyword) {
      this.debugHandled('string keyword');
      values.push({ value: generatePlaceholder(values, node), isString: isRaw ? undefined : true });
    } else if (node.kind === ts.SyntaxKind.NumberKeyword) {
      this.debugHandled('number keyword');
      values.push({ value: generatePlaceholder(values, node, true) });
    } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      this.debugHandled('undefined keyword');
      values.push({ value: 'null' });
    } /* istanbul ignore else */ else if (
      node.kind === ts.SyntaxKind.TrueKeyword ||
      node.kind === ts.SyntaxKind.FalseKeyword ||
      node.kind === ts.SyntaxKind.NullKeyword
    ) {
      this.debugHandled('true, false or null keyword');
      values.push({ value: node.getText() });
    }
  }

  static handleWithStringReturn(node: ts.Node | ts.Expression) {
    const values: Value[] = [];
    PrimitiveHandler.handle(node, values);
    /* istanbul ignore if */
    if (values.length === 0) return undefined;
    return values[0].isString ? `'${values[0].value}'` : values[0].value;
  }
}
