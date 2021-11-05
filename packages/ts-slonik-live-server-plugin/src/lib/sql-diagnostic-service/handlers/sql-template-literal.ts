import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { traceKind } from '../../util';
import { Value } from '../types';
import { checkTemplateSpanImportDeclaration } from '../util/check-import-declaration';
import { skipSiblings } from '../util/skip-siblings';
import { SlonikSqlArrayHandler } from './slonik-sql/array';
import { SlonikSqlBinaryHandler } from './slonik-sql/binary';
import { SlonikSqlIdentifierHandler } from './slonik-sql/identifier';
// eslint-disable-next-line import/no-cycle
import { SlonikSqlJoinHandler } from './slonik-sql/join';
import { SlonikSqlJsonHandler } from './slonik-sql/json';
import { SlonikSqlUnnestHandler } from './slonik-sql/unnest';
// eslint-disable-next-line import/no-cycle
import { TemplateSpanChildHandler } from './template-span-child';

export class SqlTemplteLiteralHandler {
  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    textBlocks: string[] = [],
    values: Value[] = [],
    skipAtPosition: number[] = [],
  ) {
    /* istanbul ignore next */
    LanguageServiceLogger.debug(() => [
      `[node info]`,
      `kind:`,
      traceKind(node.kind),
      `(${node.kind})`,
      `text:`,
      `>>>${node.getText()}<<<`,
    ]);
    LanguageServiceLogger.debugGroupStart();

    if (skipAtPosition.includes(node.pos)) {
      /* istanbul ignore next */
      LanguageServiceLogger.debug(() => ['skipping position', node.pos, skipAtPosition]);
    } else if (ts.isTemplateLiteralToken(node)) {
      /* istanbul ignore next */
      LanguageServiceLogger.debug(() => [`* adding text block: \`${node.text}\``]);
      textBlocks.push(node.text);
    } else if (ts.isTemplateSpan(node)) {
      const slonikExpressionText = checkTemplateSpanImportDeclaration(typeChecker, node);

      LanguageServiceLogger.debugGroupStart();
      if (slonikExpressionText) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`slonikExpressionText:`, slonikExpressionText]);
      }

      if (
        //
        // sql.array
        //
        slonikExpressionText?.startsWith('sql.array')
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.array`]);
        SlonikSqlArrayHandler.handle(typeChecker, node, values, skipAtPosition);
        skipSiblings(node, skipAtPosition);
      } else if (
        //
        // sql.binary
        //
        slonikExpressionText?.startsWith('sql.binary')
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.binary`]);
        SlonikSqlBinaryHandler.handle(values);
        skipSiblings(node, skipAtPosition);
      } else if (
        //
        // sql.identifier
        //
        slonikExpressionText?.startsWith('sql.identifier')
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.identifier`]);
        SlonikSqlIdentifierHandler.handle(node, values);
        skipSiblings(node, skipAtPosition);
      } else if (
        //
        // sql.join
        //
        slonikExpressionText?.startsWith('sql.join')
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.join`]);
        SlonikSqlJoinHandler.handle(typeChecker, node, values, skipAtPosition);
        skipSiblings(node, skipAtPosition);
      } else if (
        //
        // sql.json
        //
        slonikExpressionText?.startsWith('sql.json') &&
        ts.isCallExpression(node.expression)
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.json`]);
        SlonikSqlJsonHandler.handle(typeChecker, node.expression, values);
        skipSiblings(node, skipAtPosition);
      } else if (
        //
        // sql.unnest
        //
        slonikExpressionText?.startsWith('sql.unnest')
      ) {
        /* istanbul ignore next */
        LanguageServiceLogger.debug(() => [`* handling sql.unnest`]);
        SlonikSqlUnnestHandler.handle(node, values);
        skipSiblings(node, skipAtPosition);
      } else {
        //
        // general handler
        //

        const firstChild = node.getChildAt(0);

        const slonikRawArgExpression = (() => {
          if (
            //
            // slonik-sql-tag-raw
            //
            ts.isCallExpression(firstChild) &&
            node.expression.getText().startsWith('raw') &&
            checkTemplateSpanImportDeclaration(typeChecker, node, 'slonik-sql-tag-raw')
          ) {
            return firstChild.arguments[0];
          }
          return undefined;
        })();

        //
        // non null expression
        //
        const nonNullExpressionFirstChild = ts.isNonNullExpression(firstChild)
          ? firstChild.getChildAt(0)
          : undefined;

        TemplateSpanChildHandler.handle(
          typeChecker,
          slonikRawArgExpression || nonNullExpressionFirstChild || firstChild,
          values,
          skipAtPosition,
          !!slonikRawArgExpression,
        );
      }
      LanguageServiceLogger.debugGroupEnd();
    }

    // if textBlock.length and values.length mismatch, means value was not handled.
    // this could involve further bugs, but lets try to keep the numbers correct with empty values
    // for now..
    if (textBlocks.length - 1 > values.length) {
      values.push({ value: '' });
    }

    if (node.getChildCount()) {
      node.getChildren().forEach(n => {
        if (!skipAtPosition.includes(n.pos)) {
          LanguageServiceLogger.debugGroupStart();
          ({ textBlocks, values } = SqlTemplteLiteralHandler.handle(
            typeChecker,
            n,
            textBlocks,
            values,
            skipAtPosition,
          ));
          LanguageServiceLogger.debugGroupEnd();
        }
      });
    }

    LanguageServiceLogger.debugGroupEnd();

    return {
      textBlocks,
      values,
      nodeText: node.getText(),
    };
  }
}
