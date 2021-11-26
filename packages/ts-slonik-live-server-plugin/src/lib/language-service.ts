/* eslint-disable class-methods-use-this */
import ts from 'typescript/lib/tsserverlibrary';
import {
  TemplateContext,
  TemplateLanguageService,
} from 'typescript-template-language-service-decorator';

import { Config } from './config';
import { DiagnosticCode } from './diagnostic-code';
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
      kindModifiers: '',
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

  getSemanticDiagnostics(context: TemplateContext) {
    const diagnostic = this.sqlDiagnosticService.checkSqlNode(
      context.node.getSourceFile(),
      context.node,
    );
    if (!diagnostic) return [];
    return [diagnostic];
  }

  getSupportedCodeFixes() {
    return [
      DiagnosticCode.ok,
      DiagnosticCode.error,
      DiagnosticCode.costError,
      DiagnosticCode.costWarning,
    ];
  }

  getCodeFixesAtPosition(
    context: TemplateContext,
    start: number,
    end: number,
    errorCodes: ReadonlyArray<number>,
    formatOptions: ts.FormatCodeSettings,
  ) {
    const sourceText = context.node.getSourceFile().getFullText();

    const newLineCharacter = formatOptions.newLineCharacter || '\n';

    const disableKeywordStart =
      sourceText.lastIndexOf(newLineCharacter, context.node.getStart()) + 1;

    const indentation = formatOptions.convertTabsToSpaces
      ? sourceText.substring(disableKeywordStart).match(new RegExp(/^( +)/))
      : sourceText.substring(disableKeywordStart).match(new RegExp(/^(\t+)/));

    const previousLine = getPreviousLine(sourceText, context.node.getStart());

    const span = {
      start: disableKeywordStart - context.node.getStart() - 1,
      length: 0,
    };

    const rtn: (ts.CodeAction | ts.CodeFixAction)[] = [];

    if (
      !previousLine.includes(this.config.disableCostErrorKeyword) &&
      (errorCodes.includes(DiagnosticCode.costError) ||
        errorCodes.includes(DiagnosticCode.costWarning))
    ) {
      rtn.push({
        changes: [
          {
            fileName: context.fileName,
            textChanges: [
              {
                span,
                newText: `${indentation?.[0] || ''}// ${this.config.disableCostErrorKeyword}\n`,
              },
            ],
          },
        ],
        description: `disable ${this.config.pluginName} cost errors for this sql tagged template`,
      });
    } else if (
      !previousLine.includes(this.config.disableKeyword) &&
      errorCodes.includes(DiagnosticCode.error)
    ) {
      rtn.push({
        fixName: this.config.disableKeyword,
        changes: [
          {
            fileName: context.fileName,
            textChanges: [
              {
                span,
                newText: `${indentation?.[0] || ''}// ${this.config.disableKeyword}\n`,
              },
            ],
          },
        ],
        description: `disable ${this.config.pluginName} for this sql tagged template`,
      });
    }

    return rtn;
  }
}
