import ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';

import { Config, PluginConfig } from './lib/config';
import { SqlLanguageService } from './lib/language-service';
import { LanguageServiceLogger } from './lib/logger';
import { PgInfoService } from './lib/pg-info-service';
import { SqlDiagnosticService } from './lib/sql-diagnostic-service';

const tsSlonikPluginMarker = Symbol('__tsSlonikPluginMarker__');

class TsSlonikPlugin {
  private log: LanguageServiceLogger;

  private config: Config;

  private pgInfoService: PgInfoService;

  private sqlDiagnosticService: SqlDiagnosticService;

  constructor(private readonly typescript: typeof ts) {}

  create(info: ts.server.PluginCreateInfo) {
    if ((info.languageService as any)[tsSlonikPluginMarker]) {
      return info.languageService;
    }

    this.log = new LanguageServiceLogger(info.project.projectService.logger);
    this.config = new Config(info, this.log);
    LanguageServiceLogger.debugEnabled(this.config.debug);

    this.pgInfoService = new PgInfoService(this.config, this.log);
    this.pgInfoService.loadDbInfo();

    this.sqlDiagnosticService = new SqlDiagnosticService(
      this.config,
      this.log,
      info.languageService,
    );

    const languageService = decorateWithTemplateLanguageService(
      this.typescript,
      info.languageService,
      info.project,
      new SqlLanguageService(this.pgInfoService, this.sqlDiagnosticService, this.log),
      {
        tags: ['sql'],
        enableForStringWithSubstitutions: true,
      },
      { logger: this.log },
    );
    (languageService as any)[tsSlonikPluginMarker] = true;
    return languageService;
  }

  onConfigurationChanged(config: PluginConfig) {
    this.config.load(config);
    this.pgInfoService.loadDbInfo();
    LanguageServiceLogger.debugEnabled(this.config.debug);
  }
}

export = (mod: { typescript: typeof ts }) => new TsSlonikPlugin(mod.typescript);
