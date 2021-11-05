import { PgError } from '../../pg/query';
import { SqlInfo } from '../types';

export const getErrorPosition = (
  node: ts.Node,
  sqlInfo: Pick<SqlInfo, 'nodeText' | 'textBlocks' | 'values'>,
  sqlNodeTextParts: string[],
  error: PgError,
  errorTargetText?: string,
) => {
  const returnNodePosition = () => ({ start: node.pos, length: node.end - node.pos });

  const { position } = error;

  if (position === undefined) return returnNodePosition();

  const explainLength = 'explain\n'.length;

  let curPos = explainLength;
  let arrPos = -1;
  let isInValuePos = -1;

  for (let i = 0; i < sqlInfo.textBlocks.length; i += 1) {
    const textBlock = sqlInfo.textBlocks[i];
    arrPos += 1;
    if (curPos + textBlock.length > position) {
      break;
    }
    curPos += textBlock.length;

    if (sqlInfo.values.length > i) {
      const value = sqlInfo.values[i];
      const valueLength = value.isString ? value.value.length + 2 : value.value.length;
      arrPos += 1;
      if (curPos + valueLength > position) {
        isInValuePos = arrPos;
        break;
      }
      curPos += valueLength;
    }
  }

  if (arrPos < 0) return returnNodePosition();

  let start = 0;
  for (let i = 0; i < arrPos; i += 1) {
    start += sqlNodeTextParts[i].length;
  }
  if (errorTargetText) {
    if (isInValuePos < 0) {
      start += position - curPos - 1;
    } else {
      const value = sqlInfo.values[isInValuePos];
      if (value) {
        const valueText = value.isString ? `'${value.value}'` : value.value;
        start += valueText.indexOf(errorTargetText);
      }
    }
  }

  return {
    start,
    length: isInValuePos >= 0 ? sqlNodeTextParts[arrPos].length : errorTargetText?.length || 10,
  };
};
