/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { DateClassHandler } from './date-class';
import { FunctionHandler } from './function';
import { TypeByFlagHandler } from './type-by-flag';

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
      const type = typeChecker.getTypeAtLocation(node);
      const subValues: Value[] = [];

      /* istanbul ignore else */
      if (signature && signature.declaration) {
        FunctionHandler.handle(typeChecker, signature.declaration, subValues, isRaw);
        if (subValues.length) {
          CallExpressionHandler.debugHandled('signature declaration function');
          values.push(...subValues);
        }
      }

      // /* istanbul ignore else */
      if (!subValues.length && signature) {
        const returnType = typeChecker.getReturnTypeOfSignature(signature);
        TypeByFlagHandler.handle(returnType, subValues);
        if (subValues.length) {
          CallExpressionHandler.debugHandled('signature return type');
          values.push(...subValues);
        }
      }

      /* istanbul ignore else */
      if (!subValues.length && TypeByFlagHandler.handlable(type)) {
        TypeByFlagHandler.handle(type, subValues, isRaw);
        if (subValues.length) {
          CallExpressionHandler.debugHandled('type by flag');
          values.push(...subValues);
        }
      }
    }
  }
}
