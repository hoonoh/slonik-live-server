import { mockService } from './util';

type CompletionEntry = {
  name: string;
  kind: 'const';
  sortText: string;
};

const tables: CompletionEntry[] = [
  { name: 'schema1.table1', kind: 'const', sortText: 'schema1.table1' },
  { name: 'schema1.table2', kind: 'const', sortText: 'schema1.table2' },
  { name: 'schema1.table3', kind: 'const', sortText: 'schema1.table3' },
  { name: 'schema1.inherit_parent', kind: 'const', sortText: 'schema1.inherit_parent' },
  { name: 'schema1.inherit_child', kind: 'const', sortText: 'schema1.inherit_child' },
];

const t1Columns: CompletionEntry[] = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 'col_text', kind: 'const', sortText: 'col_text' },
  { name: 'col_text_arr', kind: 'const', sortText: 'col_text_arr' },
  { name: 'col_int', kind: 'const', sortText: 'col_int' },
  { name: 'col_int_arr', kind: 'const', sortText: 'col_int_arr' },
  { name: 'col_jsonb', kind: 'const', sortText: 'col_jsonb' },
  { name: 'col_timestamptz', kind: 'const', sortText: 'col_timestamptz' },
];
const t2Columns: CompletionEntry[] = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 't2_col_text', kind: 'const', sortText: 't2_col_text' },
  { name: 't2_col_text_arr', kind: 'const', sortText: 't2_col_text_arr' },
  { name: 't2_col_int', kind: 'const', sortText: 't2_col_int' },
  { name: 't2_col_int_arr', kind: 'const', sortText: 't2_col_int_arr' },
  { name: 't2_col_jsonb', kind: 'const', sortText: 't2_col_jsonb' },
  { name: 't2_col_timestamptz', kind: 'const', sortText: 't2_col_timestamptz' },
];
const t3Columns: CompletionEntry[] = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 't3_col_text', kind: 'const', sortText: 't3_col_text' },
  { name: 't3_col_text_arr', kind: 'const', sortText: 't3_col_text_arr' },
  { name: 't3_col_int', kind: 'const', sortText: 't3_col_int' },
  { name: 't3_col_int_arr', kind: 'const', sortText: 't3_col_int_arr' },
  { name: 't3_col_jsonb', kind: 'const', sortText: 't3_col_jsonb' },
  { name: 't3_col_timestamptz', kind: 'const', sortText: 't3_col_timestamptz' },
];

const inheritedParentColumns: CompletionEntry[] = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 'col_timestamptz', kind: 'const', sortText: 'col_timestamptz' },
];
const inheritedChildColumns: CompletionEntry[] = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 'col_timestamptz', kind: 'const', sortText: 'col_timestamptz' },
  { name: 'child_col_text', kind: 'const', sortText: 'child_col_text' },
  { name: 'child_col_text_arr', kind: 'const', sortText: 'child_col_text_arr' },
];

const joinColumns = (...columns: CompletionEntry[][]) => {
  const rtn: Record<string, CompletionEntry> = {};
  columns
    .flatMap(c => c)
    .forEach(c => {
      rtn[c.name] = c;
    });
  return Object.values(rtn);
};

const aliasColumns = (columns: CompletionEntry[], alias: string) => {
  const res = columns.reduce((rtn, c) => {
    rtn[c.name] = {
      kind: c.kind,
      name: c.name,
      sortText: c.sortText,
    };
    rtn[`${alias}.${c.name}`] = {
      kind: c.kind,
      name: `${alias}.${c.name}`,
      sortText: `${alias}.${c.sortText}`,
    };
    return rtn;
  }, {} as Record<string, CompletionEntry>);
  return Object.values(res);
};

type ColumnsWithAlias = { alias?: string; colums: CompletionEntry[] };

const joinColumnsWithAlias = (...columns: ColumnsWithAlias[]) => {
  const rtn: Record<string, CompletionEntry> = {};
  const ambiguousColumnCheck: Record<string, Set<string>> = {};
  columns
    .flatMap(ca => ca)
    .forEach(ca => {
      ca.colums.forEach(c => {
        rtn[c.name] = c;
        if (ca.alias) {
          const columnName = `${ca.alias}.${c.name}`;
          rtn[columnName] = {
            name: columnName,
            kind: c.kind,
            sortText: columnName,
          };
          if (!ambiguousColumnCheck[c.name]) {
            ambiguousColumnCheck[c.name] = new Set();
          }
          ambiguousColumnCheck[c.name].add(columnName);
        }
      });
    });
  Object.entries(ambiguousColumnCheck).forEach(([columnName, names]) => {
    if (names.size > 1) delete rtn[columnName];
  });
  return Object.values(rtn);
};

const joinSuggestion = (...columns: ColumnsWithAlias[]) => {
  const res: CompletionEntry[] = [];
  columns
    .flatMap(ca => ca)
    .flatMap(c => c.alias)
    .forEach(c => {
      if (c) res.push({ name: c, kind: 'const', sortText: c });
    });
  const firstColumn = columns.shift();
  const firstColumnNames = firstColumn?.colums.map(c => c.name);
  columns.forEach(c => {
    c.colums.forEach(c2 => {
      if (firstColumnNames?.includes(c2.name)) {
        const joinOn = `${firstColumn?.alias}.${c2.name} = ${c.alias}.${c2.name}`;
        res.push({ name: joinOn, kind: 'const', sortText: joinOn });
      }
    });
  });
  return res;
};

// const sortEntriesByName = (c: { name: string }[]) => c.sort((c1, c2) => -(c1.name < c2.name));

describe('pg-info-service', () => {
  describe('auto completion', () => {
    const { pgInfoService } = mockService([]);

    describe('select', () => {
      describe('empty table name', () => {
        const query = `select * from `;

        it('should return table names', () => {
          expect(pgInfoService.getEntries(query, { line: 0, character: 14 })).toIncludeSameMembers(
            tables,
          );
        });
      });

      describe('empty column name', () => {
        describe('single from', () => {
          const query = `select  from schema1.table3 t3`;
          it('should return column names', () => {
            const res = pgInfoService.getEntries(query, { line: 0, character: 7 });
            const exp = aliasColumns(t3Columns, 't3');
            expect(res).toEqual(exp);
          });
        });

        describe('with joins', () => {
          const query = `select  from schema1.inherit_parent tp join schema1.inherit_child tc on tc.id = tp.id`;
          it('should return column names', () => {
            const res = pgInfoService.getEntries(query, { line: 0, character: 7 });
            const exp = joinColumnsWithAlias(
              { alias: 'tp', colums: inheritedParentColumns },
              { alias: 'tc', colums: inheritedChildColumns },
            );
            expect(res).toIncludeSameMembers(exp);
          });
        });
      });

      describe('column name from table alias', () => {
        const query = `select t3. from schema1.table1 t1 join schema1.table3 t3 on t1.id = t3.id`;
        it('should return column names', () => {
          const res = pgInfoService.getEntries(query, { line: 0, character: 10 });
          expect(res).toEqual(t3Columns);
        });
      });

      describe('select without table name', () => {
        const query = `select `;
        it('should return all column names', () => {
          const res = pgInfoService.getEntries(query, { line: 0, character: 7 });
          const exp = joinColumns(
            t1Columns,
            t2Columns,
            t3Columns,
            inheritedParentColumns,
            inheritedChildColumns,
          );
          expect(res).toIncludeSameMembers(exp);
        });
      });

      describe('join', () => {
        describe('join on suggestion', () => {
          const query = `select  from schema1.table1 t1 join schema1.table2 t2 on `;
          it('should return join on suggestions', () => {
            const res = pgInfoService.getEntries(query, { line: 0, character: 57 });
            const exp = joinSuggestion(
              { alias: 't2', colums: t2Columns },
              { alias: 't1', colums: t1Columns },
            );
            expect(res).toIncludeSameMembers(exp);
          });
        });
        describe('join on column suggestion', () => {
          const query = `select * from schema1.table1 t1 join schema1.table2 t2 on t2.`;
          it('should return column names', () => {
            const res = pgInfoService.getEntries(query, { line: 0, character: 61 });
            const exp = t2Columns;
            expect(res).toIncludeSameMembers(exp);
          });
        });
      });
    });

    describe('insert', () => {
      describe('common', () => {
        const query = `
          insert into schema1.table1
          (id, col_text)
          values
          (123, 'text')
        `;

        it('should return table names', () => {
          expect(pgInfoService.getEntries(query, { line: 1, character: 23 })).toIncludeSameMembers(
            tables,
          );
        });

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 2, character: 12 })).toEqual(t1Columns);
        });
      });

      describe('insert with select', () => {
        const query = `
          insert into schema1.table1
          (id, col_text)
          select id, t2_col_text from schema1.table2
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 3, character: 18 })).toEqual(t2Columns);
        });
      });

      describe('insert with on conflict', () => {
        const query = `
          insert into schema1.table1
          (id, col_text)
          select id, t2_col_text from schema1.table2
          on conflict (id) do update set id = 123
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 4, character: 24 })).toEqual(t1Columns);
        });
      });
    });

    describe('update', () => {
      describe('common', () => {
        const query = `
          update schema1.table2
          set id = 123, values = 'text'
        `;

        it('should return table names', () => {
          expect(pgInfoService.getEntries(query, { line: 1, character: 17 })).toIncludeSameMembers(
            tables,
          );
        });

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 2, character: 15 })).toEqual(t2Columns);
        });
      });

      describe('where', () => {
        const query = `
          update schema1.table2
          set id = 123, values = 'text'
          where id = 123
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 3, character: 17 })).toEqual(t2Columns);
        });
      });

      describe('returning', () => {
        const query = `
          update schema1.table2
          set id = 123, values = 'text'
          where id = 123
          returning id
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 4, character: 21 })).toEqual(t2Columns);
        });
      });
    });

    describe('delete', () => {
      describe('common', () => {
        const query = `
          delete from schema1.table2
          where id = 123
        `;

        it('should return table names', () => {
          expect(pgInfoService.getEntries(query, { line: 1, character: 23 })).toIncludeSameMembers(
            tables,
          );
        });

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 2, character: 17 })).toEqual(t2Columns);
        });
      });

      describe('returning', () => {
        const query = `
          delete from schema1.table2
          where id = 123
          returning id
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 3, character: 21 })).toEqual(t2Columns);
        });
      });
    });

    describe('error handling', () => {
      describe('commas', () => {
        const query = `
          insert into schema1.table1
          (id,) -- comma after id
          values
          (123, 'text')
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 2, character: 14 })).toEqual(t1Columns);
        });
      });

      describe('missing column name', () => {
        const query = `
          insert into schema1.table1
          (id, col_text)
          select id, t2_col_text from schema1.table2
          on conflict (id) do update set  = 123 -- no column name set
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 4, character: 41 })).toEqual(t1Columns);
        });
      });

      describe('missing column name and value', () => {
        const query = `
          insert into schema1.table1
          (id, col_text)
          select id, t2_col_text from schema1.table2
          on conflict (id) do update set -- no column name or value set
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 4, character: 41 })).toEqual(t1Columns);
        });
      });
    });

    describe('query cleanup', () => {
      describe('commas', () => {
        const query = `
          select id from schema1.table1
          where col_jsonb->xxxxxx->'p1'->>xxxxxxxxxxxxxxx -- path names without quotes
        `;

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 1, character: 18 })).toEqual(t1Columns);
        });
      });
    });
  });
});
