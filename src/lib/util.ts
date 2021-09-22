import { SyntaxKind, TypeFlags } from 'typescript/lib/tsserverlibrary';

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
