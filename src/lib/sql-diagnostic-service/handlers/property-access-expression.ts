import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { KindHandler } from './kind';
import { LiteralHandler } from './literal';
import { TypeByFlagHandler } from './type-by-flag';

export class PropertyAccessExpressionHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('property access expression');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.PropertyAccessExpression,
    values: Value[],
    isRaw = false,
  ) {
    const symbol = typeChecker.getSymbolAtLocation(node);
    if (symbol?.valueDeclaration && ts.isPropertySignature(symbol.valueDeclaration)) {
      if (
        //
        // property signature union / intersection type
        //
        symbol.valueDeclaration.type &&
        (ts.isUnionTypeNode(symbol.valueDeclaration.type) ||
          ts.isIntersectionTypeNode(symbol.valueDeclaration.type)) &&
        symbol.valueDeclaration.type.types.length
      ) {
        // choose left most type
        PropertyAccessExpressionHandler.debugHandled('property signature union / intersection');
        const t = typeChecker.getTypeAtLocation(symbol.valueDeclaration.type.types[0]);
        TypeByFlagHandler.handle(t, values, isRaw);
      } /* istanbul ignore else */ else if (symbol.valueDeclaration.type) {
        //
        // property signature type
        //
        PropertyAccessExpressionHandler.debugHandled('property signature type');
        const t = typeChecker.getTypeAtLocation(symbol.valueDeclaration.type);
        TypeByFlagHandler.handle(t, values, isRaw);
      }
    } else if (
      symbol?.valueDeclaration &&
      (ts.isPropertyDeclaration(symbol.valueDeclaration) ||
        ts.isPropertyAssignment(symbol.valueDeclaration)) &&
      symbol.valueDeclaration.initializer
    ) {
      if (
        //
        // literal expression
        //
        ts.isLiteralExpression(symbol.valueDeclaration.initializer)
      ) {
        PropertyAccessExpressionHandler.debugHandled('initializer literal expression');
        LiteralHandler.handle(symbol.valueDeclaration.initializer, values, isRaw);
      } else {
        //
        // type
        //
        PropertyAccessExpressionHandler.debugHandled('initializer type');
        KindHandler.handle(symbol.valueDeclaration.initializer.kind, values, isRaw);
      }
    } /* istanbul ignore else */ else if (
      //
      // type
      //
      symbol?.valueDeclaration &&
      ts.isPropertyDeclaration(symbol.valueDeclaration) &&
      symbol.valueDeclaration.type
    ) {
      PropertyAccessExpressionHandler.debugHandled('value declaration type');
      const t = typeChecker.getTypeAtLocation(symbol.valueDeclaration.type);
      TypeByFlagHandler.handle(t, values, isRaw);
    }
  }
}
