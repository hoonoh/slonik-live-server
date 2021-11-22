# Slonik Live Server

Tests Slonik SQL template tag queries, suggests table & column names and checks query costs against
live PostgreSQL database

## Configuration

### Postgres connection

Connection settings can be defined by following options:

#### `slonikLiveServer.pg.uri`

If `slonikLiveServer.pg.uri` is set, any `.env` configuration will be ignored.

#### `slonikLiveServer.dotEnv`

The plugin will by default look for `.env` file in project root. If the file is located elsewhere
(e.g. monorepo), you can add it's relative path to the project root with `slonikLiveServer.dotEnv`
setting.

You can use [node-postgres](https://node-postgres.com/features/connecting) environment variables
in `.env` file, or you can define Postgres connection URI with `PGURI` environment variable. If
`PGURI` is defined, any `node-postgres` environment variables will be ignored.

### Schemas and tables

By default, any tables in `public` schema will be tested against. You can override this preset
with `include` and `exclude` rules.

#### `slonikLiveServer.pg.defaultSchema`

_Default: `public`_

If your default schema is other than `public`, add it's name to `defaultSchema` option.

#### `slonikLiveServer.pg.infoTtl`

_Default: `5000`_

TTL (in milliseconds) of DB information. The DB information (a.k.a.
[Database schema](https://en.wikipedia.org/wiki/Database_schema) in broader RDBMS terminolgy) will
be only refetched after the TTL have surpassed from last load time.

#### `slonikLiveServer.pg.include.schema`

_Default: `["public"]`_

You can override default schema with this setting. Be adviced that default schema will not be added
automatically.

#### `slonikLiveServer.pg.include.table`

_Default: `[]`_

If you wish to add tables which are not under any schemas in `slonikLiveServer.pg.include.schema`
setting, you can add them with `slonikLiveServer.pg.include.table` setting.

If table is in schema other than the default schema, define the table name as `schemaName.tableName`
(without double quotes).

#### `slonikLiveServer.pg.exclude.table`

_Default: `[]`_

Just like `slonikLiveServer.pg.include.table`, you can define any tables that you wish to explicitly
omit to test against.

### Cost

Cost is evaluated by `explain` query.

#### `slonikLiveServer.cost.info`

_Default: `true`_

If set to `true`, all query costs will be advised via code suggestion.

#### `slonikLiveServer.cost.threshold.error`

_Default: `100`_

Any cost over this value will be code error.

#### `slonikLiveServer.cost.threshold.warning`

_Default: `50`_

Any cost over this value will be code warning.
