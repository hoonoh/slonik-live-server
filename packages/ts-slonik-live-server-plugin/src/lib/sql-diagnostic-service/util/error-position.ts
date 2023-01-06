import { PgError } from '../../pg/query';
import { SqlInfo } from '../types';

export const getErrorPosition = (
  node: ts.Node,
  sqlInfo: Pick<SqlInfo, 'nodeText' | 'textBlocks' | 'values'>,
  sqlNodeTextParts: string[],
  error: PgError,
  errorTargetText?: string,
): { start: number; length: number } => {
  // fallback to total query text range
  const fallback = {
    start: 0,
    length: node.end - node.pos,
  };

  const { position } = error;

  if (position === undefined) return fallback;

  // identifiers, etc
  const errorTargetTextAlt = errorTargetText?.includes('.')
    ? errorTargetText
        .split('.')
        .map(str => `"${str}"`)
        .join('.')
    : undefined;

  let arrIdx = sqlNodeTextParts.reduce((acc, cur, idx) => {
    if (acc >= 0) return acc;
    const joined = sqlNodeTextParts
      .concat()
      .slice(0, idx + 1)
      .join('');
    if (
      joined.length >= position &&
      // case insensitive check if errorTargetText exist
      (!errorTargetText || joined.toLowerCase().includes(errorTargetText.toLowerCase()))
    ) {
      acc = idx;
    }
    return acc;
  }, -1);

  if (arrIdx < 0) {
    // try again with joined strings in sqlInfo
    const sqlResolvedTextParts = sqlNodeTextParts.reduce((acc, cur, idx) => {
      if (idx % 2 === 0) {
        acc.push(sqlInfo.textBlocks[idx / 2 || 0] || '');
      } else {
        acc.push(sqlInfo.values[(idx - 1) / 2 || 0]?.value || '');
      }
      return acc;
    }, [] as string[]);
    arrIdx = sqlResolvedTextParts.reduce((acc, cur, idx) => {
      if (acc >= 0) return acc;
      const joined = sqlResolvedTextParts
        .concat()
        .slice(0, idx + 1)
        .join('');
      if (
        joined.length >= position &&
        // case insensitive check if errorTargetText or errorTargetTextAlt exist
        (!errorTargetText ||
          joined.toLowerCase().includes(errorTargetText.toLowerCase()) ||
          !errorTargetTextAlt ||
          joined.toLowerCase().includes(errorTargetTextAlt.toLowerCase()))
      )
        acc = idx;
      return acc;
    }, -1);
  }

  const start = sqlNodeTextParts.concat().slice(0, arrIdx).join('').length;

  if (errorTargetText) {
    // find in values
    if (errorTargetText && errorTargetTextAlt) {
      const valueMatchIdx = sqlInfo.values.findIndex(({ value }, idx) => {
        return (
          idx >= arrIdx - 1 &&
          (value.includes(errorTargetText) || value.includes(errorTargetTextAlt))
        );
      });
      if (valueMatchIdx >= 0) {
        const targetValue = sqlInfo.values[valueMatchIdx].value.includes(errorTargetTextAlt)
          ? errorTargetTextAlt
          : errorTargetText;
        return {
          start: start + Math.max(0, sqlInfo.values[valueMatchIdx].value.indexOf(targetValue)),
          length: sqlNodeTextParts[arrIdx + valueMatchIdx].length,
        };
      }
    }

    // find in text blocks
    const matchIdx = sqlInfo.textBlocks.findIndex(str => {
      return str.includes(errorTargetText);
    });
    if (matchIdx >= 0) {
      return {
        start: start + Math.max(0, sqlInfo.textBlocks[matchIdx].indexOf(errorTargetText)),
        length: errorTargetText.length,
      };
    }

    // try case-insensitive search in raw text (sqlNodeTextParts)
    const caseInsentiveIdx = sqlNodeTextParts
      .join('')
      .toLowerCase()
      .indexOf(errorTargetText.toLowerCase());
    if (caseInsentiveIdx >= 0) {
      return {
        start: caseInsentiveIdx,
        length: errorTargetText.length,
      };
    }
  }

  return fallback;
};
