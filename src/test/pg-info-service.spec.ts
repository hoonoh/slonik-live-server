import { mockService } from './util';

const tables = [
  { name: 'schema1.table1', kind: 'const', sortText: 'schema1.table1' },
  { name: 'schema1.table2', kind: 'const', sortText: 'schema1.table2' },
  { name: 'schema1.table3', kind: 'const', sortText: 'schema1.table3' },
];

const t1Columns = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 'col_text', kind: 'const', sortText: 'col_text' },
  { name: 'col_text_arr', kind: 'const', sortText: 'col_text_arr' },
  { name: 'col_int', kind: 'const', sortText: 'col_int' },
  { name: 'col_int_arr', kind: 'const', sortText: 'col_int_arr' },
  { name: 'col_jsonb', kind: 'const', sortText: 'col_jsonb' },
  { name: 'col_timestamptz', kind: 'const', sortText: 'col_timestamptz' },
];
const t2Columns = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 't2_col_text', kind: 'const', sortText: 't2_col_text' },
  { name: 't2_col_text_arr', kind: 'const', sortText: 't2_col_text_arr' },
  { name: 't2_col_int', kind: 'const', sortText: 't2_col_int' },
  { name: 't2_col_int_arr', kind: 'const', sortText: 't2_col_int_arr' },
  { name: 't2_col_jsonb', kind: 'const', sortText: 't2_col_jsonb' },
  { name: 't2_col_timestamptz', kind: 'const', sortText: 't2_col_timestamptz' },
];
const t3Columns = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 't3_col_text', kind: 'const', sortText: 't3_col_text' },
  { name: 't3_col_text_arr', kind: 'const', sortText: 't3_col_text_arr' },
  { name: 't3_col_int', kind: 'const', sortText: 't3_col_int' },
  { name: 't3_col_int_arr', kind: 'const', sortText: 't3_col_int_arr' },
  { name: 't3_col_jsonb', kind: 'const', sortText: 't3_col_jsonb' },
  { name: 't3_col_timestamptz', kind: 'const', sortText: 't3_col_timestamptz' },
];
const t1t2Join = [
  { name: 'id', kind: 'const', sortText: 'id' },
  { name: 'col_text', kind: 'const', sortText: 'col_text' },
  { name: 'col_text_arr', kind: 'const', sortText: 'col_text_arr' },
  { name: 'col_int', kind: 'const', sortText: 'col_int' },
  { name: 'col_int_arr', kind: 'const', sortText: 'col_int_arr' },
  { name: 'col_jsonb', kind: 'const', sortText: 'col_jsonb' },
  { name: 'col_timestamptz', kind: 'const', sortText: 'col_timestamptz' },
  { name: 't2_col_text', kind: 'const', sortText: 't2_col_text' },
  { name: 't2_col_text_arr', kind: 'const', sortText: 't2_col_text_arr' },
  { name: 't2_col_int', kind: 'const', sortText: 't2_col_int' },
  { name: 't2_col_int_arr', kind: 'const', sortText: 't2_col_int_arr' },
  { name: 't2_col_jsonb', kind: 'const', sortText: 't2_col_jsonb' },
  { name: 't2_col_timestamptz', kind: 'const', sortText: 't2_col_timestamptz' },
];

describe('pg-info-service', () => {
  describe('auto completion', () => {
    const { pgInfoService } = mockService([]);

    describe('select', () => {
      describe('common', () => {
        const query = `select * from schema1.table3 t3`;

        it('should return table names', () => {
          expect(pgInfoService.getEntries(query, { line: 0, character: 14 })).toEqual(tables);
        });

        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 0, character: 8 })).toEqual(t3Columns);
        });
      });

      describe('join', () => {
        const query = `select * from schema1.table1 t1 join schema1.table2 t2 on id`;
        it('should return column names', () => {
          expect(pgInfoService.getEntries(query, { line: 0, character: 7 })).toEqual(t1t2Join);
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
          expect(pgInfoService.getEntries(query, { line: 1, character: 23 })).toEqual(tables);
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
          expect(pgInfoService.getEntries(query, { line: 1, character: 17 })).toEqual(tables);
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
          expect(pgInfoService.getEntries(query, { line: 1, character: 23 })).toEqual(tables);
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
  });
});
