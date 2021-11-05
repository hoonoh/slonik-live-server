import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { traceKind } from '../../util';
import { Value } from '../types';
import { skipSiblings } from '../util/skip-siblings';
import { joinTextBlocksAndValues } from '../util/textblock-value-join';
// eslint-disable-next-line import/no-cycle
import { BinaryExpressionHandler } from './binary-expression';
import { CallExpressionHandler } from './call-expression';
import { ElementAccessExpressionHandler } from './element-access-expression';
// eslint-disable-next-line import/no-cycle
import { IdentifierHandler } from './identifier';
import { PrimitiveHandler } from './primitive';
import { PropertyAccessExpressionHandler } from './property-access-expression';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from './sql-template-literal';

export class TemplateSpanChildHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('template span child');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    values: Value[],
    skipAtPosition: number[],
    isRaw = false,
  ) {
    LanguageServiceLogger.debug(() => [
      `[span child info]`,
      `isRaw:`,
      isRaw,
      `kind:`,
      traceKind(node.kind),
      `text:`,
      `>>>${node.getText()}<<<`,
    ]);
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
      BinaryExpressionHandler.handle(typeChecker, node, values, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // property access expression
      //
      ts.isPropertyAccessExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('property access expression');
      PropertyAccessExpressionHandler.handle(typeChecker, node, values, isRaw);
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
      // as expression
      //
      ts.isAsExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('as expression');
      PrimitiveHandler.handle(node.expression, values, isRaw);
      skipSiblings(node, skipAtPosition);
    } else if (
      //
      // prefix unary expression
      //
      ts.isPrefixUnaryExpression(node)
    ) {
      TemplateSpanChildHandler.debugHandled('prefix unary expression');
      values.push({ value: 'true' });
    } else if (
      //
      // element access expression
      //
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.expression)
    ) {
      TemplateSpanChildHandler.debugHandled('element access expression');
      ElementAccessExpressionHandler.handle(typeChecker, node, values, skipAtPosition, isRaw);
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
