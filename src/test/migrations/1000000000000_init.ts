import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

const schemaName = 'schema1';
const testTable1 = {
  schema: schemaName,
  name: 'table1',
};
const testTable2 = {
  schema: schemaName,
  name: 'table2',
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createSchema(schemaName);
  pgm.createTable(testTable1, {
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
  pgm.createTable(testTable2, {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    t2_col_text: {
      type: 'text',
    },
    t2_col_text_arr: {
      type: 'text[]',
    },
    t2_col_int: {
      type: 'int',
    },
    t2_col_int_arr: {
      type: 'int[]',
    },
    t2_col_jsonb: {
      type: 'jsonb',
    },
    t2_col_timestamptz: {
      type: 'timestamptz',
      default: 'now()',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(testTable1);
  pgm.dropTable(testTable2);
  pgm.dropSchema(schemaName);
}
