/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { DateClassHandler } from './date-class';
import { FunctionHandler } from './function';

export class CallExpressionHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('call expression');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.CallExpression,
    values: Value[],
    isRaw = false,
  ) {
    if (
      //
      // date class
      //
      ts.isPropertyAccessExpression(node.expression) &&
      DateClassHandler.isDateClass(typeChecker, node.expression)
    ) {
      CallExpressionHandler.debugHandled('date class method');
      DateClassHandler.handle(typeChecker, node.expression.getChildAt(0), values);
    } else {
      const signature = typeChecker.getResolvedSignature(node);
      /* istanbul ignore else */
      if (signature) {
        if (signature.declaration) {
          CallExpressionHandler.debugHandled('signature declaration function');
          FunctionHandler.handle(typeChecker, signature.declaration, values, isRaw);
          // } else {
          //   CallExpressionHandler.debugHandled('signature return type');
          //   const returnType = typeChecker.getReturnTypeOfSignature(signature);
          //   TypeByFlagHandler.handle(returnType, values);
        }
      }
    }
  }
}
