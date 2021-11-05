import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../../types';

export class SlonikSqlIdentifierHandler {
  static handle = (node: ts.TemplateSpan, values: Value[]) => {
    // sql.identifier(['sch', 'Table'])
    // -> "sch"."Table"
    const identities: string[] = [];
    (node.expression as ts.CallExpression).arguments.forEach(arg => {
      /* istanbul ignore else */
      if (ts.isArrayLiteralExpression(arg)) {
        arg.elements.forEach(e => {
          /* istanbul ignore else */
          if (ts.isStringLiteral(e)) identities.push(`"${e.text}"`);
        });
      }
    });
    values.push({ value: identities.join('.') });
  };
}
