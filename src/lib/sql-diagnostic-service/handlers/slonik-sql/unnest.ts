import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../../types';

export class SlonikSqlUnnestHandler {
  static handle = (node: ts.TemplateSpan, values: Value[]) => {
    // sql.unnest(DATA_ARRAY, ['text', 'jsonb', 'timestamptz', 'timestamptz', 'text', 'jsonb'])
    // -> unnest(array[]::"text"[], array[]::"jsonb"[], array[]::"timestamptz"[], array[]::"timestamptz"[])
    const types: string[] = [];
    (node.expression as ts.CallExpression).arguments.forEach((arg, idx) => {
      if (ts.isArrayLiteralExpression(arg) && idx === 1) {
        arg.elements.forEach(e => {
          /* istanbul ignore else */
          if (ts.isStringLiteral(e)) types.push(e.text);
          else if (ts.isArrayLiteralExpression(e)) {
            const identifiers: string[] = [];
            const getTextValues = (n: ts.Node) => {
              if (n.getChildCount() > 0) {
                n.forEachChild(c => getTextValues(c));
              } else if (ts.isStringLiteral(n)) {
                identifiers.push(n.text);
              }
            };
            getTextValues(e);
            if (identifiers.length) types.push(`"${identifiers.join(`"."`)}"`);
          }
        });
      }
    });
    const unnest = `unnest(${types.map(t => `array[]::${t}[]`).join(', ')})`;
    values.push({ value: unnest });
  };
}
