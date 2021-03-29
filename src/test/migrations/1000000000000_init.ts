import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const schemaName = 'schema';
const testTable = {
  schema: schemaName,
  name: 'table',
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createSchema(schemaName);
  pgm.createTable(testTable, {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    col_text: {
      type: 'text',
    },
    col_text_arr: {
      type: 'text[]',
    },
    col_int: {
      type: 'int',
    },
    col_int_arr: {
      type: 'int[]',
    },
    col_jsonb: {
      type: 'jsonb',
    },
    col_timestamptz: {
      type: 'timestamptz',
      default: 'now()',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(testTable);
  pgm.dropSchema(schemaName);
}
