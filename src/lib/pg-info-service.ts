import df from 'd-forest';
import { QueryResult } from 'pg';
import { ExprRef, FromTable, parse, Statement } from 'pgsql-ast-parser';
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

  private readonly curPosMarker = '___cur_pos___';

  private parseSql(query: string, position: ts.LineAndCharacter) {
    let parsedWithPos: Statement[] | undefined;
    try {
      const queryWithPos = query
        .split(/\n/g)
        .map((val, idx) => {
          if (idx !== position.line) return val;
          return (
            val.slice(0, position.character) + this.curPosMarker + val.slice(position.character)
          );
        })
        .join('\n');
      parsedWithPos = parse(queryWithPos);
    } catch (error) {
      //
    }

    const rtn: { tables?: TableInfo[]; columns?: ColumnInfo[] } = {};
    if (parsedWithPos) {
      parsedWithPos.forEach(statement => {
        const dfObj = df(statement);
        const fromTable = dfObj.findNode(
          (node?: FromTable) => node?.type === 'table' && node?.name.includes(this.curPosMarker),
        );

        if (fromTable) {
          rtn.tables = Array.from(this.allTables);
          return;
        }

        const exprRef: ExprRef = dfObj.findNode((node?: ExprRef) => node?.type === 'ref');
        if (exprRef) {
          const refTable: FromTable = exprRef.table?.name
            ? dfObj.findNode((s?: FromTable) => s?.alias === exprRef.table?.name)
            : dfObj.findNode((s?: FromTable) => s?.type === 'table');

          const schema = refTable.schema || this.config.pg.defaultSchema;
          if (refTable && schema) {
            const schemaTable = this.info[schema].tables[refTable.name];
            if (schemaTable) {
              if (!rtn.columns) rtn.columns = [];
              rtn.columns.push(...Object.values(schemaTable.columns));
            }
          } else {
            // no table definition found, return all column names
            if (!rtn.columns) rtn.columns = [];
            this.allTables.forEach(table => rtn.columns?.push(...Object.values(table.columns)));
          }
        }
      });
    }

    this.log.debug(() => ['parseSql results: ', rtn]);

    return rtn;
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
