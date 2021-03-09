import { createPool, sql } from 'slonik';

const pool = createPool('db_endpoint');

const id = 'id';
const token = 'token';

// select
pool.maybeOne(sql`select * from users.users where id = ${id}`);
pool.any(sql`select * from users.users order by id desc`);
pool.maybeOne(sql`select id, password from users.passwords where user_id = ${id}`);
pool.maybeOne(
  sql`
    select t.id, t.user_id, u.role
    from users.users u
    join users.tokens t on t.user_id = u.id
    where t.refresh_token=${token} and u.id=${id}
  `,
);

// insert
pool.query(
  sql`
    insert into users.tokens
    (user_id, refresh_token)
    values(${id}, ${token})
    returning id
  `,
);
// insert with unnest
pool.query(
  sql`
    insert into users.users (alias, email, created_at, updated_at, metadata)
    select *
    from ${sql.unnest([], ['text', 'text', 'timestamptz', 'timestamptz', 'jsonb'])}
    returning *
  `,
);
// insert with json
pool.query(sql`
  insert into media.renderers (id,extension,renderer,options)
  values (${id}, 'avif', 'sharp', ${sql.json({ note: 'note' })})
`);

// alter table
pool.query(sql`alter table users.users disable trigger insert_handler`);
