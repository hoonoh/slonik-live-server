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
        });
      }
    });
    const unnest = `unnest(${types.map(t => `array[]::${t}[]`).join(', ')})`;
    values.push({ value: unnest });
  };
}
