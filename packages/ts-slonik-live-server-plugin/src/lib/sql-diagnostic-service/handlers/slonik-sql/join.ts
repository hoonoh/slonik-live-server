import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../../types';
import { joinTextBlocksAndValues } from '../../util/textblock-value-join';
// eslint-disable-next-line import/no-cycle
import { SqlTemplteLiteralHandler } from '../sql-template-literal';

export class SlonikSqlJoinHandler {
  static handle = (
    typeChecker: ts.TypeChecker,
    node: ts.TemplateSpan,
    values: Value[],
    skipAtPosition: number[],
  ) => {
    // sql.join([1, 2], sql` AND `)
    // -> 1 AND 2
    let joinTargets: string[] = [];
    let separator = '';
    (node.expression as ts.CallExpression).arguments.forEach((arg, idx) => {
      if (idx === 0 && ts.isArrayLiteralExpression(arg)) {
        joinTargets = arg.elements.map(e => {
          if (ts.isTaggedTemplateExpression(e) && e.tag.getText().startsWith('sql')) {
            const subRecurse = SqlTemplteLiteralHandler.handle(typeChecker, e);
            skipAtPosition.push(node.pos);
            return joinTextBlocksAndValues(subRecurse);
          }
          return e.getText();
        });
      } /* istanbul ignore else */ else if (
        idx === 1 &&
        ts.isTaggedTemplateExpression(arg) &&
        ts.isNoSubstitutionTemplateLiteral(arg.template)
      ) {
        separator = arg.template.text;
        skipAtPosition.push(node.pos);
      }
    });

    values.push({ value: joinTargets.join(separator) });
  };
}
