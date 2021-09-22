/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';

import { generatePlaceholder } from '../../util';
import { Value } from '../types';

export class PrimitiveHandler {
  static handle(node: ts.Node | ts.Expression, values: Value[], isRaw = false) {
    if (ts.isStringLiteral(node)) {
      values.push({ value: node.text, isString: isRaw ? undefined : true });
    } else if (ts.isNumericLiteral(node)) {
      values.push({ value: node.text });
    } else if (node.kind === ts.SyntaxKind.StringKeyword) {
      values.push({ value: generatePlaceholder(values, node), isString: isRaw ? undefined : true });
    } else if (node.kind === ts.SyntaxKind.NumberKeyword) {
      values.push({ value: generatePlaceholder(values, node, true) });
    } else if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      values.push({ value: 'null' });
    } /* istanbul ignore else */ else if (
      node.kind === ts.SyntaxKind.TrueKeyword ||
      node.kind === ts.SyntaxKind.FalseKeyword ||
      node.kind === ts.SyntaxKind.NullKeyword
    ) {
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
