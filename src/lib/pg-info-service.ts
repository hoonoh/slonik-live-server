import df from 'd-forest';
import { QueryResult } from 'pg';
import {
  Expr,
  From,
  Name,
  nil,
  OnConflictAction,
  parse,
  PGNode,
  QNameAliased,
  SelectedColumn,
  SelectStatement,
  SetStatement,
  Statement,
} from 'pgsql-ast-parser';
import ts from 'typescript/lib/tsserverlibrary';

import { Config } from './config';
import { LanguageServiceLogger } from './logger';
import { pgQuery } from './pg/query';

type SchemaInfo = {
  name: string;
  tables: Record<string, TableInfo>;
  tableNames: string[];
};

type TableInfo = {
  name: string;
  schema: string;
  columns: Record<string, ColumnInfo>;
  columnNames: string[];
};

type ColumnInfo = {
  name: string;
  schema: string;
  table: string;
  dataType: string;
  udtName: string;
  nullable: boolean;
};

type DbInfoQuery = {
  tableSchema: string;
  tableName: string;
  columnName: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
};

export class PgInfoService {
  private info: Record<string, SchemaInfo> = {};

  private infoLoadedAt = 0;

  private allTables: Set<TableInfo> = new Set();

  constructor(private config: Config, private log: LanguageServiceLogger) {}

  loadDbInfo() {
    if (this.infoLoadedAt + this.config.pg.infoTtl > Date.now()) {
      this.log.debug(() => ['skipping DB info load due to TTL']);
      return;
    }

    const query = `
      select
      table_schema "tableSchema",
      table_name "tableName",
      column_name "columnName",
      data_type "dataType",
      udt_name "udtName",
      is_nullable::bool "isNullable"
      from information_schema.columns
      where true
      ${`and table_schema in (${this.config.pg.include.schema
        .map(schema => `'${schema}'`)
        .join(',')})`}
      ${
        this.config.pg.exclude.table.length
          ? `${this.config.pg.exclude.table
              .map(tableName => {
                let [schema, name] = tableName.split('.');
                if (!name) {
                  schema = this.config.pg.defaultSchema;
                  name = tableName;
                }
                return `and (table_schema != '${schema}' and table_name != '${name}')`;
              })
              .join('\n')}`
          : ''
      }
      ${
        this.config.pg.include.table.length
          ? `${this.config.pg.include.table
              .map(tableName => {
                let [schema, name] = tableName.split('.');
                if (!name) {
                  schema = this.config.pg.defaultSchema;
                  name = tableName;
                }
                return `or (table_schema = '${schema}' and table_name = '${name}')`;
              })
              .join('\n')}`
          : ''
      }
      order by table_schema, table_name, ordinal_position;
      `;

    this.log.debug(() => ['schema query:', query]);

    let queryResult: QueryResult<DbInfoQuery> | undefined;
    let pgError: Error | undefined;

    try {
      queryResult = pgQuery(this.config, query);
    } catch (error) {
      pgError = error;
    }

    if (pgError) {
      this.log.error(`Query error while fetching DB info with error:`, pgError?.message);
      return;
    }
    if (!queryResult) {
      this.log.error(`DB info is not retrieved. Check plugin configuration.`);
      return;
    }

    const info: Record<string, SchemaInfo> = {};
    queryResult?.rows.forEach(res => {
      const { tableSchema, tableName, columnName, dataType, udtName, isNullable } = res;
      if (!info[tableSchema]) {
        info[tableSchema] = { name: tableSchema, tables: {}, tableNames: [] };
      }

      const schema = info[tableSchema];
      if (!schema.tables[tableName]) {
        schema.tables[tableName] = {
          name: tableName,
          schema: tableSchema,
          columns: {},
          columnNames: [],
        };
        schema.tableNames.push(tableName);
      }

      const table = schema.tables[tableName];
      this.allTables.add(table);

      if (!table.columns[columnName]) {
        table.columns[columnName] = {
          name: columnName,
          schema: tableSchema,
          table: tableName,
          dataType,
          udtName,
          nullable: isNullable,
        };
        table.columnNames.push(columnName);
      }
    });

    this.info = info;
    this.infoLoadedAt = Date.now();

    this.log.info('DB info loaded');
    this.log.debug(() => ['DB info:', this.info]);
  }

  private parseSql(query: string, position: ts.LineAndCharacter) {
    let posFromLineAndChars = query.split('\n').reduce((pos, cur, idx, arr) => {
      if (idx < position.line) {
        pos += cur.length + 1;
      } else if (idx >= position.line) {
        while (arr.length) arr.pop();
        pos += position.character;
      }
      return pos;
    }, 0);

    let parsed: Statement[] | undefined;

    /**
     * retry is required query text can contain errors while editing (e.g. repeated commas)
     */
    const parseWithRetry = (retryCount = 3) => {
      try {
        parsed = parse(query, { locationTracking: true });
      } catch (error) {
        retryCount -= 1;
        if (retryCount > 0) {
          query = query.substr(0, posFromLineAndChars - 1) + query.substr(posFromLineAndChars);
          posFromLineAndChars -= 1;
          parseWithRetry(retryCount);
        }
      }
    };
    parseWithRetry();

    const results: { tables?: TableInfo[]; columns?: ColumnInfo[] } = {};

    if (parsed) {
      parsed.forEach(statement => {
        /**
         * find if current position is within target group
         */
        const findNodes = (target: any) => {
          df(target).findNodes(
            (node: PGNode) =>
              node._location &&
              node._location.start <= posFromLineAndChars &&
              node._location.end >= posFromLineAndChars,
          );
          let start = Number.POSITIVE_INFINITY;
          let end = Number.NEGATIVE_INFINITY;
          start -= 1234;
          df(target).forEachNode((node: PGNode) => {
            if (node._location) {
              start = Math.min(start, node._location.start);
              end = Math.max(end, node._location.end);
            }
          });
          return start <= posFromLineAndChars && end >= posFromLineAndChars ? target : [];
        };

        const handleSelect = (from: From[] | nil, columns: SelectedColumn[] | nil) => {
          const tableHover: From[] = findNodes(from);
          const columnHover: SelectedColumn[] = findNodes(columns);

          if (tableHover.length) {
            results.tables = Array.from(this.allTables);
          } else if (columnHover.length) {
            const tables = from
              ?.filter(f => f.type === 'table')
              .reduce((rtn, f) => {
                if (f.type === 'table') {
                  const { schema } = f;
                  const { name } = f;
                  if (schema && name) rtn.push(this.info[schema].tables[name]);
                  return rtn;
                }
                return rtn;
              }, [] as TableInfo[]);

            results.columns = tables?.reduce((rtn, cur) => {
              rtn.push(...Object.values(cur.columns));
              return rtn;
            }, [] as ColumnInfo[]);
          }
        };

        if (statement.type === 'select') {
          //
          // select
          //
          handleSelect(statement.from, statement.columns);
        } else if (statement.type === 'insert') {
          //
          // insert
          //
          const selectHover: SelectStatement[] = findNodes(statement.select);
          if (selectHover.length && statement.select?.type === 'select') {
            handleSelect(statement.select.from, statement.select.columns);
          } else {
            const tableHover: QNameAliased[] = findNodes(statement.into);
            const columnHover: Name[] = findNodes(statement.columns);
            // const valuesHover: (Expr | 'default')[][] = findNodes(statement.values);
            const returningHover: SelectedColumn[] = findNodes(statement.returning);
            const onConflictHover: OnConflictAction[] = findNodes(statement.onConflict);

            if (
              tableHover.length ||
              returningHover.length ||
              (onConflictHover.length &&
                onConflictHover[0].do !== 'do nothing' &&
                onConflictHover[0].do.sets.length)
            ) {
              results.tables = Array.from(this.allTables);
            } else if (columnHover.length) {
              const schema = statement.into.schema || this.config.pg.defaultSchema;
              results.columns = Object.values(
                this.info[schema].tables[statement.into.name].columns,
              );
            }
          }
        } else if (statement.type === 'update') {
          //
          // update
          //
          const tableHover: QNameAliased[] = findNodes(statement.table);
          const setsHover: SetStatement[] = findNodes(statement.sets);
          const whereHover: Expr[] = findNodes(statement.where);
          const returningHover: SelectedColumn[] = findNodes(statement.returning);
          // todo: pgsql-ast-parser missing `from`

          if (tableHover.length) {
            results.tables = Array.from(this.allTables);
          } else if (setsHover.length || whereHover.length || returningHover.length) {
            const schema = statement.table.schema || this.config.pg.defaultSchema;
            results.columns = Object.values(this.info[schema].tables[statement.table.name].columns);
          }
        } else if (statement.type === 'delete') {
          //
          // delete
          //
          const tableHover: QNameAliased[] = findNodes(statement.from);
          const whereHover: Expr[] = findNodes(statement.where);
          const returningHover: SelectedColumn[] = findNodes(statement.returning);
          // todo: pgsql-ast-parser missing `using`

          if (tableHover.length) {
            results.tables = Array.from(this.allTables);
          } else if (whereHover.length || returningHover.length) {
            const schema = statement.from.schema || this.config.pg.defaultSchema;
            results.columns = Object.values(this.info[schema].tables[statement.from.name].columns);
          }
        }
      });
    }

    this.log.debug(() => ['parseSql results: ', results]);

    return results;
  }

  getEntries(query: string, position: ts.LineAndCharacter) {
    const entries = new Map<string, ts.CompletionEntry>();

    const { tables, columns } = this.parseSql(query, position);

    if (tables) {
      tables.forEach(table => {
        const fullName = `${
          table.schema === this.config.pg.defaultSchema ? '' : `${table.schema}.`
        }${table.name}`;
        entries.set(fullName, {
          name: fullName,
          kind: ts.ScriptElementKind.constElement,
          sortText: fullName,
        });
      });
    } else if (columns) {
      columns.forEach(column => {
        entries.set(column.name, {
          name: column.name,
          kind: ts.ScriptElementKind.constElement,
          sortText: column.name,
        });
      });
    }

    return Array.from(entries.values());
  }

  getDocumentation(query: string, position: ts.LineAndCharacter, name: string) {
    const documentation: ts.SymbolDisplayPart[] = [];
    const { tables, columns } = this.parseSql(query, position);

    if (tables) {
      const [, tableName] = name.split('.');
      let [tableSchema] = name.split('.');
      if (!tableSchema && this.config.pg.defaultSchema) tableSchema = this.config.pg.defaultSchema;

      if (tableSchema) {
        documentation.push({
          kind: ts.ScriptElementKind.keyword,
          text: [`schema: ${tableSchema}`, `table: ${tableName}`].map(t => `    ${t}`).join('\n'),
        });
      }
    } else if (columns) {
      const column = columns.find(c => c.name === name);
      if (column) {
        documentation.push({
          kind: ts.ScriptElementKind.keyword,
          text: [
            `schema: ${column.schema}`,
            `table: ${column.table}`,
            `column: ${column.name}`,
            `type: ${column.dataType}`,
          ]
            .map(t => `    ${t}`)
            .join('\n'),
        });
      }
    }

    return documentation;
  }
}
