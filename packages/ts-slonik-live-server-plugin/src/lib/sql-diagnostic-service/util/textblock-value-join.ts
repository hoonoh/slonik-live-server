import { SqlInfo } from '../types';

export const joinTextBlocksAndValues = (
  info: Pick<SqlInfo, 'textBlocks' | 'values' | 'nodeText'>,
  noQuotes = false,
) => {
  if (info.textBlocks.length > 0 && info.textBlocks.length - 1 !== info.values.length) {
    const escapeAndJoin = (str: string[]) =>
      str.map(t => `"${t.replace(new RegExp('"', 'g'), '\\"')}"`).join(', ');
    throw new Error(
      `invalid textBlock and value pairs\n` +
        `textBlocks: [${escapeAndJoin(info.textBlocks)}]\n\n` +
        `values:\n${JSON.stringify(info.values, null, 2)}\n\n` +
        `nodeText:\n${info.nodeText}\n`,
    );
  }
  return info.textBlocks.reduce((rtn, text, idx) => {
    const isTableName = text.match(/(from|into|update|join)[\s\n\r]+?$/i);
    const value = info.values[idx] || { value: '' };
    return `${rtn}${text}${
      !noQuotes && !isTableName && value.isString ? `'${value.value}'` : value.value
    }`;
  }, '');
};
