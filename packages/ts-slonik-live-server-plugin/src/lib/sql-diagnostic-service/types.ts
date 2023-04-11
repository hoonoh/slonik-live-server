import ts from 'typescript';

export type Value = {
  value: string;
  isString?: boolean;
};

export type SqlInfo = {
  nodeText: string;
  textBlocks: string[];
  values: Value[];
  raw: string;
  explain: string;
};

export type SqlDiagnostic = SqlInfo & {
  ttl: number;
  diagnostic: ts.Diagnostic;
  costErrorEnabled: boolean;
};
