/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';
import {
  TemplateContext,
  TemplateLanguageService,
} from 'typescript-template-language-service-decorator';

import { Config } from './config';
import { LanguageServiceLogger } from './logger';
import { PgInfoService } from './pg-info-service';
import { SqlDiagnosticService } from './sql-diagnostic-service';
import { getPreviousLine } from './util';

export class SqlLanguageService implements TemplateLanguageService {
  constructor(
    private pgInfoService: PgInfoService,
    private sqlDiagnosticService: SqlDiagnosticService,
    private log: LanguageServiceLogger,
    private config: Config,
  ) {}

  getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string,
  ): ts.CompletionEntryDetails {
    const documentation: ts.SymbolDisplayPart[] = this.pgInfoService.getDocumentation(
      context.text,
      position,
      name,
    );
    this.log.debug(() => ['documentation:', documentation]);

    return {
      displayParts: [],
      kind: ts.ScriptElementKind.keyword,
      kindModifiers: 'ts-slonik-live-server-plugin',
      name,
      documentation,
    };
  }

  getCompletionsAtPosition(context: TemplateContext, position: ts.LineAndCharacter) {
    const entries = this.pgInfoService.getEntries(context.text, position);
    this.log.debug(() => ['entries:', entries]);

    return {
      entries,
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: true,
    };
  }

  getSemanticDiagnostics = (context: TemplateContext) => {
    const diagnostic = this.sqlDiagnosticService.checkSqlNode(
      context.node.getSourceFile(),
      context.node,
    );
    if (!diagnostic) return [];
    return [diagnostic];
  };

  getCodeFixesAtPosition = (
    context: TemplateContext,
    start: number,
    end: number,
    errorCodes: ReadonlyArray<number>,
    formatOptions: ts.FormatCodeSettings,
  ) => {
    const sourceText = context.node.getSourceFile().getFullText();

    let disableKeywordStart = sourceText.lastIndexOf('\n', context.node.getStart()) + 1;
    let disableKeywordLength = 0;

    const indentation = formatOptions.convertTabsToSpaces
      ? sourceText.substr(disableKeywordStart).match(new RegExp(/^( +)/))
      : sourceText.substr(disableKeywordStart).match(new RegExp(/^(\t+)/));

    const previousLine = getPreviousLine(sourceText, context.node.getStart());

    const rtn: ts.CodeAction[] = [];

    if (!previousLine.includes(this.config.disableCostErrorKeyword)) {
      rtn.push({
        changes: [
          {
            fileName: context.fileName,
            textChanges: [
              {
                span: {
                  start: disableKeywordStart - context.node.getStart() - 1,
                  length: disableKeywordLength,
                },
                newText: `${indentation?.[0] || ''}// ${this.config.disableCostErrorKeyword}\n`,
              },
            ],
          },
        ],
        description:
          'disable ts-slonik-live-server-plugin cost errors for this sql tagged template',
      });
    } else {
      disableKeywordStart = sourceText.indexOf(previousLine) + 1;
      disableKeywordLength = previousLine.length;
    }

    return [
      ...rtn,
      {
        fixName: 'ts-slonik-live-server-plugin-ignore',
        changes: [
          {
            fileName: context.fileName,
            textChanges: [
              {
                span: {
                  start: disableKeywordStart - context.node.getStart() - 1,
                  length: disableKeywordLength,
                },
                newText: `${indentation?.[0] || ''}// ${this.config.disableKeyword}\n`,
              },
            ],
          },
        ],
        description: 'disable ts-slonik-live-server-plugin for this sql tagged template',
      },
    ];
  };
}
