import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { CallExpressionHandler } from './call-expression';
import { LiteralHandler } from './literal';
import { PropertyAccessExpressionHandler } from './property-access-expression';
// eslint-disable-next-line import/no-cycle
import { TypeByFlagHandler } from './type-by-flag';

export class BinaryExpressionHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('binary expression');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.BinaryExpression,
    values: Value[],
    isRaw = false,
  ) {
    if (
      //
      // property access expression
      //
      ts.isPropertyAccessExpression(node.right)
    ) {
      BinaryExpressionHandler.debugHandled('property access expression');
      PropertyAccessExpressionHandler.handle(typeChecker, node.right, values, isRaw);
    } else if (
      //
      // literal expression
      //
      ts.isLiteralExpression(node.right)
    ) {
      BinaryExpressionHandler.debugHandled('literal expression');
      LiteralHandler.handle(node.right, values, isRaw);
    } else if (ts.isCallExpression(node.right)) {
      BinaryExpressionHandler.debugHandled('call expression');
      CallExpressionHandler.handle(typeChecker, node.right, values, isRaw);
    } else {
      BinaryExpressionHandler.debugHandled('type');
      const type = typeChecker.getTypeAtLocation(node);
      TypeByFlagHandler.handle(type, values, isRaw);
    }
  }
}
