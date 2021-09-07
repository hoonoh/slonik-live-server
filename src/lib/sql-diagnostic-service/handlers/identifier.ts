import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { checkSymbolImportDeclaration } from '../util/check-import-declaration';
import { joinTextBlocksAndValues } from '../util/textblock-value-join';
// eslint-disable-next-line import/no-cycle
import { BinaryExpressionHandler } from './binary-expression';
import { BindingElementHandler } from './binding-element';
import { CallExpressionHandler } from './call-expression';
import { KindHandler } from './kind';
import { LiteralHandler } from './literal';
import { PrimitiveHandler } from './primitive';
import { PropertyAccessExpressionHandler } from './property-access-expression';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from './sql-template-literal';
import { TypeByFlagHandler } from './type-by-flag';
import { TypeReferenceHandler } from './type-reference';

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
      if (symbol.valueDeclaration && ts.isParameter(symbol.valueDeclaration)) {
        initializer = symbol.valueDeclaration.initializer;
        if (symbol.valueDeclaration.type && ts.isLiteralTypeNode(symbol.valueDeclaration.type)) {
          kind = symbol.valueDeclaration.type.literal.kind;
        } else {
          kind = symbol.valueDeclaration.type?.kind;
        }
      } else if (symbol.valueDeclaration && ts.isVariableDeclaration(symbol.valueDeclaration)) {
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
      // parameter
      //
      valueDeclaration &&
      ts.isParameter(valueDeclaration)
    ) {
      IdentifierHandler.debugHandled('parameter');
      if (
        valueDeclaration.type &&
        ts.isLiteralTypeNode(valueDeclaration.type) &&
        ts.isLiteralExpression(valueDeclaration.type.literal)
      ) {
        LiteralHandler.handle(valueDeclaration.type.literal, values, isRaw);
      } else if (valueDeclaration.type) {
        const t = typeChecker.getTypeAtLocation(valueDeclaration.type);
        TypeByFlagHandler.handle(t, values, isRaw);
      }
    } else if (
      //
      // property access expression
      //
      initializer &&
      ts.isPropertyAccessExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('property access expression');
      PropertyAccessExpressionHandler.handle(typeChecker, initializer, values, isRaw);
    } else if (
      //
      // binding element
      //
      valueDeclaration &&
      ts.isBindingElement(valueDeclaration)
    ) {
      IdentifierHandler.debugHandled('binding element');
      BindingElementHandler.handle(typeChecker, valueDeclaration, values, isRaw);
    } else if (
      //
      // type reference
      //
      valueDeclaration &&
      ts.isVariableDeclaration(valueDeclaration) &&
      valueDeclaration.type &&
      ts.isTypeReferenceNode(valueDeclaration.type)
    ) {
      IdentifierHandler.debugHandled('type reference');
      TypeReferenceHandler.handle(typeChecker, node, values, isRaw);
    } else if (
      //
      // variable declaration
      //
      valueDeclaration &&
      ts.isVariableDeclaration(valueDeclaration) &&
      valueDeclaration.type
    ) {
      IdentifierHandler.debugHandled('variable declaration');
      PrimitiveHandler.handle(valueDeclaration.type, values, isRaw);
    } else if (
      //
      // binary expression
      //
      initializer &&
      ts.isBinaryExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('binary expression');
      BinaryExpressionHandler.handle(typeChecker, initializer, values, isRaw);
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
    } else if (
      //
      // literal expression
      //
      initializer &&
      ts.isLiteralExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('literal expression');
      LiteralHandler.handle(initializer, values, isRaw);
    } else if (
      //
      // prefix unary expression
      //
      initializer &&
      ts.isPrefixUnaryExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('prefix unary expression');
      values.push({ value: 'true' });
    } else if (
      //
      // template expression
      //
      initializer &&
      ts.isTemplateExpression(initializer)
    ) {
      IdentifierHandler.debugHandled('template expression');
      skipAtPosition.push(initializer.pos);
      values.push({
        isString: true,
        value: joinTextBlocksAndValues(SqlTemplteLiteralHandler.handle(typeChecker, initializer)),
      });
    } /* istanbul ignore else */ else if (
      //
      // fallback
      //
      kind
    ) {
      IdentifierHandler.debugHandled('kind (fallback)');
      KindHandler.handle(kind, values, isRaw);
    }
  }
}
