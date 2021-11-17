import { parse } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { DeepPartial, DeepReadonly } from 'ts-essentials';

import { LanguageServiceLogger } from './logger';

type PgEnv = {
  PGHOST?: string;
  PGUSER?: string;
  PGDATABASE?: string;
  PGPASSWORD?: string;
  PGPORT?: string;
  PGURI?: string;
};

type PgDiagnosticTarget = {
  schema: string[];
  table: string[];
};

type PgConfig = {
  uri: string;
  defaultSchema: string;
  infoTtl: number;
  include: PgDiagnosticTarget;
  exclude: Pick<PgDiagnosticTarget, 'table'>;
};

type CostThreshold = {
  warning: number;
  error: number;
};

type CostConfig = {
  pattern: string;
  info: boolean;
  threshold: CostThreshold;
};

export type PluginConfig = {
  dotEnv?: string;
  debug?: boolean;
  pg: PgConfig;
  cost: CostConfig;
};

export class Config implements DeepReadonly<PluginConfig> {
  private defaultConfig: DeepReadonly<PluginConfig> = {
    debug: false,
    pg: {
      uri: 'postgres://localhost/postgres',
      defaultSchema: 'public',
      infoTtl: 5000,
      include: {
        schema: ['public'],
        table: [],
      },
      exclude: {
        table: [],
      },
    },
    cost: {
      pattern: '\\(cost=\\d+.?\\d*\\.\\.(\\d+.?\\d*)',
      info: true,
      threshold: {
        error: 100,
        warning: 50,
      },
    },
  };

  private current: DeepReadonly<PluginConfig>;

  get debug() {
    return !!this.current.debug;
  }

  get pg() {
    return this.current.pg as DeepReadonly<PgConfig>;
  }

  get cost() {
    return this.current.cost as DeepReadonly<CostConfig>;
  }

  constructor(private info?: ts.server.PluginCreateInfo, private log?: LanguageServiceLogger) {
    this.load(info?.config);
  }

  load(config?: DeepPartial<PluginConfig>) {
    let pgUri: string | undefined;
    if (!config?.pg?.uri) {
      const projectPath = this.info?.project.getCurrentDirectory();
      const envPath = projectPath
        ? resolve(__dirname, projectPath, config?.dotEnv || '.env')
        : '__no_exist__';

      if (!existsSync(envPath)) {
        this.log?.error('.env not found at:', envPath);
      } else {
        const pgConfig = parse(readFileSync(envPath).toString('utf-8')) as PgEnv;
        if (pgConfig.PGURI) {
          pgUri = pgConfig.PGURI;
        } else if (
          pgConfig.PGHOST !== undefined ||
          (pgConfig.PGUSER === undefined &&
            pgConfig.PGPASSWORD === undefined &&
            pgConfig.PGHOST === undefined &&
            pgConfig.PGPORT === undefined &&
            pgConfig.PGDATABASE === undefined)
        ) {
          pgUri = `postgresql://`;
          if (pgConfig.PGUSER) pgUri += pgConfig.PGUSER;
          if (pgConfig.PGPASSWORD) pgUri += `:${pgConfig.PGPASSWORD}`;
          if (pgConfig.PGUSER) pgUri += '@';
          if (pgConfig.PGHOST) pgUri += pgConfig.PGHOST;
          if (pgConfig.PGPORT) pgUri += `:${pgConfig.PGPORT}`;
          if (pgConfig.PGDATABASE) pgUri += `/${pgConfig.PGDATABASE}`;
        }
      }
    }

    if (!pgUri) pgUri = config?.pg?.uri || this.defaultConfig.pg.uri;

    this.current = {
      dotEnv: config?.dotEnv,
      debug: config?.debug ?? this.defaultConfig.debug,
      pg: {
        uri: pgUri || this.defaultConfig.pg.uri,
        defaultSchema: config?.pg?.defaultSchema ?? this.defaultConfig.pg.defaultSchema,
        infoTtl: config?.pg?.infoTtl ?? this.defaultConfig.pg.infoTtl,
        include: {
          schema: config?.pg?.include?.schema ?? this.defaultConfig.pg.include.schema,
          table: config?.pg?.include?.table ?? this.defaultConfig.pg.include.table,
        },
        exclude: {
          table: config?.pg?.exclude?.table ?? this.defaultConfig.pg.exclude.table,
        },
      },
      cost: {
        pattern: config?.cost?.pattern ?? this.defaultConfig.cost.pattern,
        info: config?.cost?.info ?? this.defaultConfig.cost.info,
        threshold: {
          error: config?.cost?.threshold?.error ?? this.defaultConfig.cost.threshold?.error,
          warning: config?.cost?.threshold?.warning ?? this.defaultConfig.cost.threshold?.warning,
        },
      },
    };

    const configOutput = JSON.stringify(this.current, null, 2);
    const [, , password] = configOutput.match(/postgresql\:\/\/(.+)\:(.+)@/) || ['', '', ''];

    this.log?.info('loaded config:', configOutput.replace(password, '*'.repeat(password.length)));
  }
}
