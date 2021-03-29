import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { checkSymbolImportDeclaration } from '../util/check-import-declaration';
import { joinTextBlocksAndValues } from '../util/textblock-value-join';
import { DateClassHandler } from './date-class';
import { FunctionHandler } from './function';
import { PrimitiveHandler } from './primitive';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from './sql-template-literal';
import { TypeByFlagHandler } from './type-by-flag';

export class IdentifierHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('identifier');

  private static handleByKind(
    kind: ts.SyntaxKind,
    values: Value[],
    initializer?: ts.Expression,
    isRaw = false,
  ) {
    if (kind === ts.SyntaxKind.NumberKeyword || kind === ts.SyntaxKind.NumericLiteral) {
      IdentifierHandler.debugHandled('number');
      const value = initializer && ts.isNumericLiteral(initializer) ? initializer.text : '1';
      values.push({ value });
    } else if (kind === ts.SyntaxKind.StringKeyword || kind === ts.SyntaxKind.StringLiteral) {
      IdentifierHandler.debugHandled('string');
      const value = initializer && ts.isStringLiteral(initializer) ? initializer.text : 'a';
      values.push({ value, isString: isRaw ? undefined : true });
    } else if (kind === ts.SyntaxKind.TrueKeyword || kind === ts.SyntaxKind.BooleanKeyword) {
      IdentifierHandler.debugHandled('true');
      values.push({ value: 'true' });
    } else if (kind === ts.SyntaxKind.FalseKeyword) {
      IdentifierHandler.debugHandled('false');
      values.push({ value: 'false' });
    } /* istanbul ignore else */ else if (
      kind === ts.SyntaxKind.NullKeyword ||
      kind === ts.SyntaxKind.UndefinedKeyword
    ) {
      IdentifierHandler.debugHandled('null');
      values.push({ value: 'null' });
    }
  }

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
      if (ts.isIdentifier(initializer.expression)) {
        IdentifierHandler.debugHandled('call expression identifier');
        IdentifierHandler.handle(typeChecker, initializer.expression, values, []);
      } else {
        IdentifierHandler.debugHandled('call expression');
        const signature = typeChecker.getResolvedSignature(initializer);
        /* istanbul ignore else */
        if (signature) {
          const returnType = typeChecker.getReturnTypeOfSignature(signature);
          TypeByFlagHandler.handle(returnType, values);
        }
      }
    } else if (
      //
      // function
      //
      (valueDeclaration && initializer && ts.isArrowFunction(initializer)) ||
      (valueDeclaration && ts.isFunctionDeclaration(valueDeclaration))
    ) {
      IdentifierHandler.debugHandled('function');
      FunctionHandler.handle(valueDeclaration, values, isRaw);
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
      IdentifierHandler.handleByKind(valueDeclaration.type.kind, values, initializer, isRaw);
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
    } else if (
      //
      // method signature
      //
      valueDeclaration &&
      ts.isMethodSignature(valueDeclaration) &&
      !DateClassHandler.handle(typeChecker, node.getChildAt(0), values) &&
      valueDeclaration.type
    ) {
      IdentifierHandler.debugHandled('method signature');
      IdentifierHandler.handleByKind(valueDeclaration.type.kind, values, initializer, isRaw);
    } else if (
      //
      // method declaration
      //
      valueDeclaration &&
      ts.isMethodDeclaration(valueDeclaration)
    ) {
      const signature = typeChecker.getSignatureFromDeclaration(valueDeclaration);
      /* istanbul ignore else */
      if (
        !signature?.declaration?.parent ||
        !DateClassHandler.handle(typeChecker, signature?.declaration?.parent, values, true)
      ) {
        IdentifierHandler.debugHandled('method declaration');
        FunctionHandler.handle(valueDeclaration, values, isRaw);
      }
    } /* istanbul ignore else */ else if (
      //
      // fallback
      //
      kind
    ) {
      IdentifierHandler.debugHandled('kind (fallback)');
      IdentifierHandler.handleByKind(kind, values, initializer, isRaw);
    }
  }
}
