import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { EnumMemberHandler } from './enum-member';
import { KindHandler } from './kind';
import { LiteralHandler } from './literal';
import { PropertySignatureHandler } from './property-signature';
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
    const type = typeChecker.getTypeAtLocation(node);
    if (symbol?.valueDeclaration && ts.isPropertySignature(symbol.valueDeclaration)) {
      PropertyAccessExpressionHandler.debugHandled('property signature');
      PropertySignatureHandler.handle(typeChecker, symbol.valueDeclaration, values, isRaw);
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
    } else if (
      //
      // enum member
      //
      symbol?.valueDeclaration &&
      ts.isEnumMember(symbol.valueDeclaration)
    ) {
      PropertyAccessExpressionHandler.debugHandled('enum member');
      EnumMemberHandler.handle(symbol.valueDeclaration, values, isRaw);
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
    } else if (type) {
      PropertyAccessExpressionHandler.debugHandled('type');
      TypeByFlagHandler.handle(type, values, isRaw);
    } else if (symbol?.declarations) {
      PropertyAccessExpressionHandler.debugHandled('symbol declarations');
      const subValues: Value[] = [];
      symbol.declarations.forEach(dec => {
        if (subValues.length === 0 && ts.isPropertySignature(dec)) {
          PropertySignatureHandler.handle(typeChecker, dec, subValues, isRaw);
        }
      });
      if (subValues.length) values.push(...subValues);
    }
  }
}
