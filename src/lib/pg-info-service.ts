import df from 'd-forest';
import { QueryResult } from 'pg';
import { From, nil, parse, PGNode, SelectedColumn, Statement } from 'pgsql-ast-parser';
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
    const posAbsolute = query.split('\n').reduce((pos, cur, idx, arr) => {
      if (idx < position.line) {
        pos += cur.length + 1;
      } else if (idx >= position.line) {
        while (arr.length) arr.pop();
        pos += position.character;
      }
      return pos;
    }, 0);

    let posAdjusted = posAbsolute;

    let parsed: Statement[] | undefined;

    /**
     * retry is required query text can contain errors while editing (e.g. repeated commas)
     */
    const parseWithRetry = (queryText: string, retryId = 0) => {
      try {
        parsed = parse(queryText, { locationTracking: true });
      } catch (error) {
        this.log.debug(() => ['parseWithRetry error:', error.message, error]);

        retryId += 1;

        if (retryId === 1) {
          //
          // remove comma
          // (e.g. `on conflict (id,) do update set id = 0`)
          //                       ^
          queryText = query.substr(0, posAbsolute - 1) + query.substr(posAbsolute);
          posAdjusted = posAbsolute - 1;

          this.log.debug(() => [
            'retry: id:',
            retryId,
            'posAbsolute:',
            posAbsolute,
            'posAdjusted:',
            posAdjusted,
            'queryText:',
            queryText,
          ]);

          parseWithRetry(queryText, retryId);
        } else if (retryId === 2) {
          //
          // add mocked column name
          // (e.g. `on conflict (id) do update set   = 0`)
          //                                       ^
          queryText = `${query.substr(0, posAbsolute)}a ${query.substr(posAbsolute)}`;
          posAdjusted = posAbsolute + 1;

          this.log.debug(() => [
            'retry: id:',
            retryId,
            'posAbsolute:',
            posAbsolute,
            'posAdjusted:',
            posAdjusted,
            'queryText:',
            queryText,
          ]);

          parseWithRetry(queryText, retryId);
        } else if (retryId === 3) {
          //
          // add mocked column name with value
          // (e.g. `on conflict (id) do update set   `)
          //                                       ^
          queryText = `${query.substr(0, posAbsolute)}a=1 ${query.substr(posAbsolute)}`;
          posAdjusted = posAbsolute + 3;

          this.log.debug(() => [
            'retry: id:',
            retryId,
            'posAbsolute:',
            posAbsolute,
            'posAdjusted:',
            posAdjusted,
            'queryText:',
            queryText,
          ]);

          parseWithRetry(queryText, retryId);
        }
      }
    };
    parseWithRetry(query);

    const results: { tables?: TableInfo[]; columns?: ColumnInfo[] } = {};

    if (parsed) {
      parsed.forEach(statement => {
        /**
         * find if current position is within target group
         */
        const findNodes = <T>(target: T) => {
          df(target).findNodes(
            (node: PGNode) =>
              node._location &&
              node._location.start <= posAdjusted &&
              node._location.end >= posAdjusted,
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

          return start <= posAdjusted && end >= posAdjusted ? target : undefined;
        };

        const handleSelect = (from: From[] | nil, columns: SelectedColumn[] | nil) => {
          const tableHover = findNodes(from);
          const columnHover = findNodes(columns);

          if (tableHover) {
            results.tables = Array.from(this.allTables);
          } /* istanbul ignore else */ else if (columnHover) {
            const tables = from
              ?.filter(f => f.type === 'table')
              .reduce((rtn, f) => {
                /* istanbul ignore else */
                if (f.type === 'table') {
                  const { schema } = f;
                  const { name } = f;
                  /* istanbul ignore else */
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
          const selectHover = findNodes(statement.select);
          if (selectHover && statement.select?.type === 'select') {
            handleSelect(statement.select.from, statement.select.columns);
          } else {
            const tableHover = findNodes(statement.into);
            const columnHover = findNodes(statement.columns);
            // const valuesHover = findNodes(statement.values);
            const returningHover = findNodes(statement.returning);
            const onConflictHover = findNodes(statement.onConflict);

            if (tableHover || returningHover) {
              results.tables = Array.from(this.allTables);
            } else if (
              columnHover ||
              (onConflictHover &&
                onConflictHover.do !== 'do nothing' &&
                onConflictHover.do.sets.length)
            ) {
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
          const tableHover = findNodes(statement.table);
          const setsHover = findNodes(statement.sets);
          const whereHover = findNodes(statement.where);
          const returningHover = findNodes(statement.returning);
          // todo: pgsql-ast-parser missing `from`

          if (tableHover) {
            results.tables = Array.from(this.allTables);
          } else if (setsHover || whereHover || returningHover) {
            const schema = statement.table.schema || this.config.pg.defaultSchema;
            results.columns = Object.values(this.info[schema].tables[statement.table.name].columns);
          }
        } else if (statement.type === 'delete') {
          //
          // delete
          //
          const tableHover = findNodes(statement.from);
          const whereHover = findNodes(statement.where);
          const returningHover = findNodes(statement.returning);
          // todo: pgsql-ast-parser missing `using`

          if (tableHover) {
            results.tables = Array.from(this.allTables);
          } else if (whereHover || returningHover) {
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
