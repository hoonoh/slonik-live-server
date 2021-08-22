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
const testTable3 = {
  schema: schemaName,
  name: 'table3',
};
const testInheritedTableParent = {
  schema: schemaName,
  name: 'inherit_parent',
};
const testInheritedTableChild = {
  schema: schemaName,
  name: 'inherit_child',
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
  pgm.createTable(testTable3, {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    t3_col_text: {
      type: 'text',
    },
    t3_col_text_arr: {
      type: 'text[]',
    },
    t3_col_int: {
      type: 'int',
    },
    t3_col_int_arr: {
      type: 'int[]',
    },
    t3_col_jsonb: {
      type: 'jsonb',
    },
    t3_col_timestamptz: {
      type: 'timestamptz',
      default: 'now()',
    },
  });
  pgm.createTable(testInheritedTableParent, {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    col_timestamptz: {
      type: 'timestamptz',
      default: 'now()',
    },
  });
  pgm.createTable(
    testInheritedTableChild,
    {
      child_col_text: {
        type: 'text',
      },
      child_col_text_arr: {
        type: 'text[]',
      },
    },
    { inherits: testInheritedTableParent },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable(testInheritedTableChild);
  pgm.dropTable(testInheritedTableParent);
  pgm.dropTable(testTable1);
  pgm.dropTable(testTable2);
  pgm.dropTable(testTable3);
  pgm.dropSchema(schemaName);
}
