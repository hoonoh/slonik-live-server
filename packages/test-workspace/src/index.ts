/* eslint-disable @typescript-eslint/no-unused-expressions */
import { sql } from 'slonik';
import { raw } from 'slonik-sql-tag-raw';

const string = 'string';
const number = 1123000;

sql.unsafe`select ${'string'}`;
sql.unsafe`select ${string}`;
sql.unsafe`select ${1123001}`;
sql.unsafe`select ${number}`;
sql.unsafe`select (${sql.array([1, 2, 3], 'int4')})`;
sql.unsafe`select (${sql.binary(Buffer.from('abc'))})`;
sql.unsafe`select 1123002 from ${sql.identifier(['users', 'users'])}`;
sql.unsafe`select ${string} where ${sql.join([true, true], sql.fragment` and `)}`;
sql.unsafe`select (${sql.join([1, 2], sql.fragment`, `)})`;
sql.unsafe`
  select ${sql.join(
    [
      sql.fragment`(${sql.join([1, 2], sql.fragment`, `)})`,
      sql.fragment`(${sql.join([3, 4], sql.fragment`, `)})`,
    ],
    sql.fragment`, `,
  )}
`;
sql.unsafe`select ${sql.join([1, 2], sql.fragment`, `)}`;
sql.unsafe`
    select bar, baz
    from ${sql.unnest(
      [
        [1, 'foo'],
        [2, 'bar'],
      ],
      ['int4', 'text'],
    )} AS foo(bar, baz)
  `;

// ts-slonik-live-server-plugin-disable-cost-errors
sql.unsafe`
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

  sql.unsafe`delete from ${table} where col_text_arrZ in (${sql.array(
    valueMatchingText,
    columnTypeText,
  )})`;

  const foo = 'col_text_arr';
  sql.unsafe`delete from ${'table'} where ${raw(foo)} in (${sql.array(
    valueMatchingText,
    columnTypeText,
  )})
  and foo bar1
  `;

  sql.unsafe`delete from ${table} where ${raw(foo)} in (${sql.array(
    valueMatchingText,
    columnTypeText,
  )})
  and foo bar2
  `;

  sql.unsafe`delete from schema1.table1 where col_text_arr1 in (${sql.array(
    valueMatchingText,
    columnTypeText,
  )})
  `;
  sql.unsafe`delete from ${table}
    where true
    and ${raw(foo)} in (${sql.array(valueMatchingText, columnTypeText)})
    and col_text = ${'foo'}
    and foo bar3
  `;
  const fooStr = 'foo';
  sql.unsafe`
    delete from ${table}
    where true
    and col_text = ${fooStr}
    and col_text = ${'foo'}
    and foobarbaz
  `;

  sql.unsafe`delete from ${table} where col_int_arr in (${sql.array(
    valueMatchingInt,
    columnTypeInt,
  )})`;
})();

(table: 'schema1.table1', columnType: 'int4', valueMatching: ('a' | 'b' | 'c')[]) => {
  sql.unsafe`delete from ${table} where col_int_arr in (${sql.array(valueMatching, columnType)})`;
};
