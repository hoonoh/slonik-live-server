/* eslint-disable @typescript-eslint/no-unused-expressions */

//
// this file will always be reset on commit via git hooks (husky)
//

import { sql } from 'slonik';

sql.unsafe`select ${sql.json({
  foo: 'foo',
  bar: 'bar',
  baz: {
    foo: [1, 2, 3],
    baz: 456,
  },
})}`;
