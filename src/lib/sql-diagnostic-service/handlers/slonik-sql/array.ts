import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../../types';
import { PrimitiveHandler } from '../primitive';

export class SlonikSqlArrayHandler {
  static handle = (typeChecker: ts.TypeChecker, node: ts.TemplateSpan, values: Value[]) => {
    // sql`select (${sql.array([1, 2, 3], 'int4')})`
    // -> select [1, 2, 3]::"int4"[]
    const array: string[] = [];
    let type = '';

    const addPrimitive = (expression: ts.Expression) => {
      const value = PrimitiveHandler.handleWithStringReturn(expression);
      /* istanbul ignore else */
      if (value) array.push(value);
    };

    /* istanbul ignore else */
    if (ts.isCallExpression(node.expression)) {
      node.expression.arguments.forEach((arg, idx) => {
        if (idx === 0) {
          if (ts.isArrayLiteralExpression(arg)) {
            arg.elements.forEach(e => {
              addPrimitive(e);
            });
          } /* istanbul ignore else */ else if (ts.isIdentifier(arg)) {
            const symbol = typeChecker.getSymbolAtLocation(arg);
            symbol?.getDeclarations()?.forEach(d => {
              /* istanbul ignore else */
              if (
                ts.isVariableDeclaration(d) &&
                d.initializer &&
                ts.isArrayLiteralExpression(d.initializer)
              ) {
                d.initializer.elements.forEach(e => {
                  addPrimitive(e);
                });
              }
            });
          }
        } /* istanbul ignore else */ else if (idx === 1) {
          if (ts.isStringLiteral(arg)) {
            type = arg.text;
          } /* istanbul ignore else */ else if (ts.isIdentifier(arg)) {
            const sType = typeChecker.getTypeAtLocation(arg);
            /* istanbul ignore else */
            if (sType?.isStringLiteral()) {
              type = sType.value;
            }
          }
        }
      });
    }
    values.push({ value: `array[${array.join(', ')}]::${type}[]` });
  };
}
