import { createHash } from 'crypto';
import ts, { SyntaxKind, TypeFlags } from 'typescript/lib/tsserverlibrary';

import { Value } from './sql-diagnostic-service/types';

export const traceTypeFlag = (flag?: number) => {
  const res = Object.entries(TypeFlags).find(([k]) => {
    return k === flag?.toString();
  });
  if (res) return res[1];
  return '___INVALID_TYPE_FLAG___';
};

export const traceKind = (kind?: number) => {
  const res = Object.entries(SyntaxKind).find(([k]) => {
    return k === kind?.toString();
  });
  if (res) return res[1];
  return '___INVALID_KIND___';
};

export const getPreviousLine = (text: string, start: number) => {
  const idx1 = text.lastIndexOf('\n', start);
  const idx2 = text.lastIndexOf('\n', idx1 - 1);
  return text.substring(idx2 + 1, idx1);
};

export const generatePlaceholder = (values: Value[], node?: ts.Node, returnNumber = false) => {
  let src = '';

  if (node) {
    src = JSON.stringify({
      node: {
        childCount: node.getChildCount(),
        fullText: node.getFullText(),
        fullWidth: node.getFullWidth(),
        pos: node.pos,
        leadingTriviaWidth: node.getLeadingTriviaWidth(),
        start: node.getStart(),
      },
      values,
    });
  } else {
    src = JSON.stringify({ values });
  }

  if (!returnNumber) {
    let rtn = `a${createHash('sha1').update(src).digest('hex').substr(0, 7)}`;
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    while (values.find(v => v.value === rtn)) {
      rtn = (parseInt(rtn, 16) + 1).toString();
    }
    return rtn;
  }

  // returns numeral value between 0 ~ (32767 - 1000) to support at smallint types & unique values
  let rtn = Math.floor(
    parseInt(createHash('sha1').update(src).digest('hex').substr(0, 4), 16) / 2 - 1000,
  ).toString();
  // eslint-disable-next-line @typescript-eslint/no-loop-func
  while (values.find(v => v.value === rtn)) {
    rtn = (parseInt(rtn, 10) + 1).toString();
  }
  return rtn;
};
