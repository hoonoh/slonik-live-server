/* eslint-disable @typescript-eslint/no-unused-expressions */
import { sql } from 'slonik';

const string = 'string';
const number = 1123000;

sql`select ${'string'}`;
sql`select ${string}`;
sql`select ${1123001}`;
sql`select ${number}`;
sql`select (${sql.array([1, 2, 3], 'int4')})`;
sql`select (${sql.binary(Buffer.from('abc'))})`;
sql`select 1123002 from ${sql.identifier(['users', 'users'])}`;
sql`select ${string} where ${sql.join([true, true], sql` and `)}`;
sql`select (${sql.join([1, 2], sql`, `)})`;
sql`
  select ${sql.join(
    [sql`(${sql.join([1, 2], sql`, `)})`, sql`(${sql.join([3, 4], sql`, `)})`],
    sql`, `,
  )}
`;
sql`select ${sql.join([1, 2], sql`, `)}`;
sql`
    select bar, baz
    from ${sql.unnest(
      [
        [1, 'foo'],
        [2, 'bar'],
      ],
      ['int4', 'text'],
    )} AS foo(bar, baz)
  `;

// ts-slonik-plugin-disable-cost-errors
sql`
  select
  table_schema "tableSchema",
  table_name "tableName",
  column_name "columnName",
  data_type "dataType",
  udt_name "udtName",
  is_nullable "isNullable"
  from information_schema.columns
  where true
  and table_schema not in ('pg_catalog', 'information_schema')
  order by table_schema, table_name, ordinal_position;
`;

(() => {
  const table = 'schema1.table1';
  const valueMatchingText = ['a', 'b', 'c'];
  const columnTypeText = 'text';
  const valueMatchingInt = [1, 2, 3];
  const columnTypeInt = 'int4';

  sql`delete from ${table} where col_test in (${sql.array(valueMatchingText, columnTypeText)})`;

  sql`delete from ${table} where col_int_arr in (${sql.array(valueMatchingInt, columnTypeInt)})`;
})();

(table: 'schema1.table1', columnType: 'int4', valueMatching: ('a' | 'b' | 'c')[]) => {
  sql`delete from ${table} where col_int_arr in (${sql.array(valueMatching, columnType)})`;
};
