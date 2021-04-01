import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { checkSymbolImportDeclaration } from '../util/check-import-declaration';
import { joinTextBlocksAndValues } from '../util/textblock-value-join';
import { CallExpressionHandler } from './call-expression';
import { KindHandler } from './kind';
import { PrimitiveHandler } from './primitive';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from './sql-template-literal';

export class IdentifierHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('identifier');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    values: Value[],
    skipAtPosition: number[],
    isRaw?: boolean,
  ) {
    const symbol = typeChecker.getSymbolAtLocation(node);
    let kind: ts.SyntaxKind | undefined;
    let valueDeclaration:
      | ts.ParameterDeclaration
      | ts.VariableLikeDeclaration
      | ts.FunctionLikeDeclaration
      | ts.Declaration
      | undefined;
    let initializer: ts.Expression | undefined;

    /* istanbul ignore else */
    if (symbol) {
      valueDeclaration = symbol.valueDeclaration;
      if (ts.isParameter(symbol.valueDeclaration)) {
        initializer = symbol.valueDeclaration.initializer;
        if (symbol.valueDeclaration.type && ts.isLiteralTypeNode(symbol.valueDeclaration.type)) {
          kind = symbol.valueDeclaration.type.literal.kind;
        } else {
          kind = symbol.valueDeclaration.type?.kind;
        }
      } else if (ts.isVariableDeclaration(symbol.valueDeclaration)) {
        kind = symbol.valueDeclaration.initializer?.kind;
        initializer = symbol.valueDeclaration.initializer;
      }
    }

    if (
      //
      // nested sql template literal
      //
      symbol &&
      initializer &&
      ts.isTaggedTemplateExpression(initializer) &&
      checkSymbolImportDeclaration(typeChecker, symbol)
    ) {
      IdentifierHandler.debugHandled('sql template literal');

      if (ts.isNoSubstitutionTemplateLiteral(initializer.template)) {
        // default sql template literal from initializer
        skipAtPosition.push(initializer.template.pos);
        values.push({ value: initializer.template.text });
      } /* istanbul ignore else */ else if (ts.isTemplateExpression(initializer.template)) {
        // template literal to be furter parsed
        skipAtPosition.push(initializer.template.pos);
        values.push({
          value: joinTextBlocksAndValues(
            SqlTemplteLiteralHandler.handle(typeChecker, initializer.template),
          ),
        });
      }
    } else if (
      //
      // call expression
      //
      initializer &&
      ts.isCallExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('call expression');
      CallExpressionHandler.handle(typeChecker, initializer, values, isRaw);
    } else if (
      //
      // property assignment
      //
      valueDeclaration &&
      ts.isPropertyAssignment(valueDeclaration)
    ) {
      IdentifierHandler.debugHandled('property assignment');
      PrimitiveHandler.handle(valueDeclaration.initializer, values, isRaw);
    } else if (
      //
      // property access expression
      //
      valueDeclaration &&
      (ts.isPropertyDeclaration(valueDeclaration) || ts.isPropertySignature(valueDeclaration)) &&
      valueDeclaration.type?.kind
    ) {
      IdentifierHandler.debugHandled('property access expression');
      initializer = valueDeclaration.initializer;
      KindHandler.handle(valueDeclaration.type.kind, values, initializer, isRaw);
    } else if (
      //
      // value declaration type
      //
      valueDeclaration &&
      ts.isVariableDeclaration(valueDeclaration) &&
      valueDeclaration.type
    ) {
      IdentifierHandler.debugHandled('primitive');
      PrimitiveHandler.handle(valueDeclaration.type, values, isRaw);
    } else if (
      //
      // undefined
      //
      valueDeclaration &&
      ts.isVariableDeclaration(valueDeclaration) &&
      valueDeclaration.initializer &&
      ts.isIdentifier(valueDeclaration.initializer) &&
      valueDeclaration.initializer.escapedText === 'undefined'
    ) {
      IdentifierHandler.debugHandled('null from undefined');
      values.push({ value: 'null' });
    } /* istanbul ignore else */ else if (
      //
      // fallback
      //
      kind
    ) {
      IdentifierHandler.debugHandled('kind (fallback)');
      KindHandler.handle(kind, values, initializer, isRaw);
    }
  }
}
