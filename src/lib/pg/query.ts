import { execSync } from 'child_process';
import { QueryResult } from 'pg';

import { Config } from '../config';

// from pg-protocol/dist/messages.d.ts DatabaseError
interface PgErrorProps {
  error: string; // custom (error message)
  readonly length: number;
  // readonly name: MessageName;
  severity?: string;
  code?: string;
  detail?: string;
  hint?: string;
  position?: number; // changed from string
  internalPosition?: number; // changed from string
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: number; // changed from string
  routine?: string;
}

export class PgError extends Error implements Omit<PgErrorProps, 'error'> {
  readonly length: number;

  severity?: string;

  code?: string;

  detail?: string;

  hint?: string;

  position?: number;

  internalPosition?: number;

  internalQuery?: string;

  where?: string;

  schema?: string;

  table?: string;

  column?: string;

  dataType?: string;

  constraint?: string;

  file?: string;

  line?: number;

  routine?: string;

  constructor(props: PgErrorProps) {
    super(props.error);
    this.length = props.length;
    this.severity = props.severity;
    this.code = props.code;
    this.detail = props.detail;
    this.hint = props.hint;
    this.position = props.position;
    this.internalPosition = props.internalPosition;
    this.internalQuery = props.internalQuery;
    this.where = props.where;
    this.schema = props.schema;
    this.table = props.table;
    this.column = props.column;
    this.dataType = props.dataType;
    this.constraint = props.constraint;
    this.file = props.file;
    this.line = props.line;
    this.routine = props.routine;
  }
}

export const pgQuery = (config: Config, sql: string) => {
  const command = `node ${__dirname}/pg.js "${config.pg.uri}" "${sql.replace(/"/g, '\\"')}"`;
  const res = JSON.parse(execSync(command).toString());
  if (res.error) throw new PgError(res);
  return res as QueryResult<any>;
};
