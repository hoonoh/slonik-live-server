import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../../types';
import { CallExpressionHandler } from '../call-expression';
import { FunctionHandler } from '../function';
import { PropertyAccessExpressionHandler } from '../property-access-expression';

export class SlonikSqlJsonHandler {
  /**
   * handles basic primitives only
   */
  private static objectExpressionToJson = (
    typeChecker: ts.TypeChecker,
    exp: ts.Expression,
    join: any = {},
    recursedDepth = 0,
  ): string | any => {
    const fallback = (expSub: ts.Expression) => {
      if (ts.isNumericLiteral(expSub)) {
        return parseFloat(expSub.text);
      }
      if (ts.isStringLiteral(expSub)) {
        return expSub.text;
      }
      return expSub.getText();
    };

    if (
      //
      // top node as array literal
      //
      ts.isArrayLiteralExpression(exp)
    ) {
      const rtn = exp.elements.map(e =>
        SlonikSqlJsonHandler.objectExpressionToJson(typeChecker, e, join, recursedDepth + 1),
      );
      return recursedDepth === 0 ? JSON.stringify(rtn) : rtn;
    }

    if (
      //
      // as expression
      //
      ts.isAsExpression(exp)
    ) {
      const rtn = SlonikSqlJsonHandler.objectExpressionToJson(
        typeChecker,
        exp.expression,
        join,
        recursedDepth + 1,
      );
      return recursedDepth === 0 ? JSON.stringify(rtn) : rtn;
    }

    if (ts.isObjectLiteralExpression(exp)) {
      exp.properties.forEach(prop => {
        let name: string | undefined;

        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          name = prop.name.escapedText.toString();
        } else if (ts.isPropertyAssignment(prop) && ts.isComputedPropertyName(prop.name)) {
          const symbol = typeChecker.getSymbolAtLocation(prop.name);
          if (symbol?.escapedName) {
            name = symbol.escapedName.toString();
          }
        }

        name ??= `UNRESOLVED_NAME: ${prop.name?.getText()}`;

        /* istanbul ignore else */
        if (ts.isPropertyAssignment(prop)) {
          if (ts.isObjectLiteralExpression(prop.initializer)) {
            join[name] = SlonikSqlJsonHandler.objectExpressionToJson(
              typeChecker,
              prop.initializer,
              join[name],
              recursedDepth + 1,
            );
          } else if (ts.isArrayLiteralExpression(prop.initializer)) {
            join[name] = prop.initializer.elements.reduce((rtn, p) => {
              rtn.push(
                SlonikSqlJsonHandler.objectExpressionToJson(
                  typeChecker,
                  p,
                  undefined,
                  recursedDepth + 1,
                ),
              );
              return rtn;
            }, [] as Record<string, unknown>[]);
          } else if (ts.isCallExpression(prop.initializer)) {
            const v: Value[] = [];
            CallExpressionHandler.handle(typeChecker, prop.initializer, v);
            join[name] = v[0]?.value;
          } else if (ts.isPropertyAccessExpression(prop.initializer)) {
            const v: Value[] = [];
            PropertyAccessExpressionHandler.handle(typeChecker, prop.initializer, v);
            join[name] = v[0]?.value;
          } else {
            join[name] = fallback(prop.initializer);
          }
        }
      });
      return recursedDepth === 0 ? JSON.stringify(join) : join;
    }
    const rtn = fallback(exp);
    return recursedDepth === 0 ? JSON.stringify(rtn) : rtn;
  };

  static handle = (typeChecker: ts.TypeChecker, firstChild: ts.CallExpression, values: Value[]) => {
    let symbol: ts.Symbol | undefined;
    let declaration: ts.Declaration | undefined;

    /* istanbul ignore else */
    if (firstChild.arguments.length) {
      const firstArg = firstChild.arguments[0];
      if (ts.isIdentifier(firstArg)) {
        symbol = typeChecker.getSymbolAtLocation(firstChild.arguments[0]);
        declaration = symbol?.valueDeclaration;
      } else if (ts.isCallExpression(firstArg)) {
        symbol = typeChecker.getSymbolAtLocation(firstArg.expression);
        declaration = symbol?.valueDeclaration;
      }
    }

    const functionBody = declaration ? FunctionHandler.getFunctionBody(declaration) : undefined;

    if (functionBody) {
      if (ts.isBlock(functionBody)) {
        const returnType = functionBody.statements.filter(c => ts.isReturnStatement(c)).pop();
        if (returnType && ts.isReturnStatement(returnType) && returnType.expression) {
          values.push({
            value: SlonikSqlJsonHandler.objectExpressionToJson(typeChecker, returnType.expression),
            isString: true,
          });
        }
      } else if (
        //
        // parenthesized
        //
        ts.isParenthesizedExpression(functionBody) &&
        ts.isObjectLiteralExpression(functionBody.expression)
      ) {
        values.push({
          value: SlonikSqlJsonHandler.objectExpressionToJson(typeChecker, functionBody.expression),
          isString: true,
        });
      } else {
        values.push({
          value: SlonikSqlJsonHandler.objectExpressionToJson(typeChecker, functionBody),
          isString: true,
        });
      }
    } else if (
      symbol?.valueDeclaration &&
      ts.isVariableDeclaration(symbol.valueDeclaration) &&
      symbol.valueDeclaration.initializer &&
      ts.isObjectLiteralExpression(symbol.valueDeclaration.initializer)
    ) {
      values.push({
        value: SlonikSqlJsonHandler.objectExpressionToJson(
          typeChecker,
          symbol.valueDeclaration.initializer,
        ),
        isString: true,
      });
    } else {
      values.push({
        value: SlonikSqlJsonHandler.objectExpressionToJson(typeChecker, firstChild.arguments[0]),
        isString: true,
      });
    }
  };
}
