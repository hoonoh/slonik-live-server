import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { skipSiblings } from '../util/skip-siblings';
import { PrimitiveHandler } from './primitive';
import { TypeByFlagHandler } from './type-by-flag';

export class ElementAccessExpressionHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('element access expression');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.ElementAccessExpression,
    values: Value[],
    skipAtPosition: number[],
    isRaw = false,
  ) {
    let handled = false;
    const symbol = typeChecker.getSymbolAtLocation(node.expression);
    /* istanbul ignore else */
    if (
      //
      // array
      //
      symbol &&
      symbol.valueDeclaration &&
      ts.isVariableDeclaration(symbol.valueDeclaration) &&
      symbol.valueDeclaration.initializer &&
      ts.isArrayLiteralExpression(symbol.valueDeclaration.initializer) &&
      ts.isNumericLiteral(node.argumentExpression)
    ) {
      const idx = parseInt(node.argumentExpression.text, 10);
      const arrayValueNode = symbol.valueDeclaration.initializer.elements[idx];
      if (ts.isStringLiteral(arrayValueNode)) {
        values.push({ value: arrayValueNode.text, isString: isRaw ? undefined : true });
      } else if (ts.isNumericLiteral(arrayValueNode)) {
        values.push({ value: arrayValueNode.text });
      } else {
        PrimitiveHandler.handle(arrayValueNode, values);
      }
      skipSiblings(node, skipAtPosition);
      handled = true;
      ElementAccessExpressionHandler.debugHandled('array');
    }
    if (!handled) {
      //
      // fallback to type value
      //
      const t = typeChecker.getTypeAtLocation(node);
      TypeByFlagHandler.handle(t, values, isRaw);
      skipSiblings(node, skipAtPosition);
      ElementAccessExpressionHandler.debugHandled('type (fallback)');
    }
  }
}
