# ts-slonik-plugin

Typescript language server plugin for [slonik](https://github.com/gajus/slonik).

This plugin tests slonik sql template tag qurries and checks it's cost against a real database.

## Installation

`yarn add -D ts-slonik-plugin`

or

`npm i -D ts-slonik-plugin`

## Settings

Add to `plugins` section in `tsconfig.json`:

```json
{
  "compilerOptions": {
    ...
    "plugins": [
      {
        "name": "ts-slonik-plugin",
        "dotEnv": "../.env",
        "pg": {
          "uri": "postgres://localhost/postgres",
          "defaultSchema": "public",
          "infoTtl": 5000,
          "include": {
            "schema": ["public", "users"],
            "table": ["schema1.table1"]
          },
          "exclude": {
            "table": ["schema1.table1"]
          }
        },
        "cost": {
          "info": true,
          "threshold": {
            "error": 100,
            "warning": 50
          }
        }
      }
    ]
  }
}
```

### VS Code

<https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#testing-locally>

> Note: If you're using Visual Studio Code, you'll have to use the first approach above, with a path
> to the module, or run the "TypeScript: Select TypeScript Version" command and choose "Use
> Workspace > Version", or click the version number between "TypeScript" and 😃 in the
> lower-right corner. Otherwise, VS Code will not be able to find your plugin.

### Postgres connection

Connection settings can be defined by following options:

#### pg.uri

If `pg.uri` is set under plugin setting in `tsconfig.json`, any `.env` configuration will be
ignored.

#### .env

The plugin will by default look for `.env` file in project root. If the file is located elsewhere
(e.g. monorepo), you can add it's relative path to the project root with `dotEnv` setting.

You can use [node-postgres](https://node-postgres.com/features/connecting) environment variables
in `.env` file, or you can define Postgres connection URI with `PGURI` environment variable. If
`PGURI` is defined, any `node-postgres` environment variables will be ignored.

### Schemas and tables

By default, any tables in `public` schema will be tested against. You can override this preset
with `include` and `exclude` rules.

#### pg.defaultSchema

_Default: `public`_

If your default schema is other than `public`, add it's name to `defaultSchema` option.

#### pg.infoTtl

_Default: `5000`_

TTL (in milliseconds) of DB information. The DB information (a.k.a.
[Database schema](https://en.wikipedia.org/wiki/Database_schema) in broader RDBMS terminolgy) will
be only refetched after the TTL have surpassed from last load time.

#### pg.include

##### pg.include.schema

_Default: `["public"]`_

You can override default schema with this setting. Be adviced that default schema will not be added
automatically.

##### pg.include.table

_Default: `[]`_

If you wish to add tables which are not under any schemas in `pg.include.schema` setting, you can
add them with `pg.include.table` setting.

If table is in schema other than the default schema, define the table name as
`schemaName.tableName` (without double quotes).

#### pg.exclude

##### pg.exclude.table

_Default: `[]`_

Just like `pg.include.table`, you can define any tables that you wish to explicitly omit to test
against.

### Cost

Cost is evaluated by `explain` query.

#### cost.info

_Default: `true`_

If set to `true`, all query costs will be advised via code suggestion.

#### cost.threshold.error

_Default: `100`_

Any cost over this value will be code error.

#### cost.threshold.warning

_Default: `50`_

Any cost over this value will be code warning.

## Notes

This project was inspired by [ts-sql-plugin](https://github.com/xialvjun/ts-sql-plugin)
