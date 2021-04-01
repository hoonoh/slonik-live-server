import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { skipSiblings } from '../util/skip-siblings';
import { joinTextBlocksAndValues } from '../util/textblock-value-join';
import { CallExpressionHandler } from './call-expression';
// eslint-disable-next-line import/no-cycle
import { IdentifierHandler } from './identifier';
import { PrimitiveHandler } from './primitive';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from './sql-template-literal';
import { TypeByFlagHandler } from './type-by-flag';

export class TemplateSpanChildHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('template span child');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    values: Value[],
    skipAtPosition: number[],
    isRaw = false,
  ) {
    if (
      //
      // primitives
      //
      ts.isStringLiteral(node) ||
      ts.isNumericLiteral(node) ||
      node.kind === ts.SyntaxKind.UndefinedKeyword ||
      node.kind === ts.SyntaxKind.TrueKeyword ||
      node.kind === ts.SyntaxKind.FalseKeyword ||
      node.kind === ts.SyntaxKind.NullKeyword
    ) {
      TemplateSpanChildHandler.debugHandled('primitive');
      PrimitiveHandler.handle(node, values, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // binary expression
      //
      ts.isBinaryExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('binary expression');
      const type = typeChecker.getTypeAtLocation(node);
      TypeByFlagHandler.handle(type, values);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // identifier
      //
      ts.isIdentifier(node)
    ) {
      TemplateSpanChildHandler.debugHandled('identifier');
      IdentifierHandler.handle(typeChecker, node, values, skipAtPosition, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // call expression
      //
      ts.isCallExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('call expression');
      CallExpressionHandler.handle(typeChecker, node, values, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // property access expression
      //
      ts.isPropertyAccessExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('property access expression');
      IdentifierHandler.handle(typeChecker, node, values, skipAtPosition, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // as expression
      //
      ts.isAsExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('as expression');
      PrimitiveHandler.handle(node.expression, values, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // element access expression
      //
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      TemplateSpanChildHandler.debugHandled('element access expression');
      let handled = false;
      const symbol = typeChecker.getSymbolAtLocation(node.expression);
      /* istanbul ignore else */
      if (
        //
        // array
        //
        symbol &&
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
      }
      if (!handled) {
        //
        // fallback to type value
        //
        const t = typeChecker.getTypeAtLocation(node);
        TypeByFlagHandler.handle(t, values);
        skipSiblings(node, skipAtPosition);
      }
    } /* istanbul ignore else */ else if (
      //
      // conditional expression
      //
      ts.isConditionalExpression(node)
    ) {
      // [binary express, question token, [identifier / primitive], colon token, [identifier / primitive]]
      TemplateSpanChildHandler.debugHandled('conditional expression');
      const candidate: Value[] = [];
      const parseValues = (n: ts.Node) => {
        if (ts.isIdentifier(n)) {
          const v: Value[] = [];
          IdentifierHandler.handle(typeChecker, n, v, []);
          /* istanbul ignore else */
          if (v.length) candidate.push(v[0]);
        } else {
          const str = joinTextBlocksAndValues(SqlTemplteLiteralHandler.handle(typeChecker, n));
          if (str) {
            candidate.push({ value: str });
          } else {
            // try primitive handling
            const v: Value[] = [];
            PrimitiveHandler.handle(n, v);
            /* istanbul ignore else */
            if (v.length) candidate.push(v[0]);
          }
        }
      };
      parseValues(node.whenTrue);
      parseValues(node.whenFalse);
      /* istanbul ignore else */
      if (candidate.length) values.push(candidate[0]);
      skipSiblings(node, skipAtPosition);
    } else {
      //
      // unhandled
      //
      TemplateSpanChildHandler.debugHandled('UNHANDLED');
      values.push({ value: `'unhandled node: ${node.getText()}'` });
      skipSiblings(node, skipAtPosition);
    }
  }
}
