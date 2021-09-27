/* eslint-disable class-methods-use-this */
import { createHash } from 'crypto';
import { QueryResult } from 'pg';
import ts from 'typescript/lib/tsserverlibrary';

import { Config } from '../config';
import { LanguageServiceLogger } from '../logger';
import { PgError, pgQuery } from '../pg/query';
import { getPreviousLine } from '../util';
import { disableCostErrorKeyword, disableKeyword, disablerErrorCode } from './constants';
import { SqlTemplteLiteralHandler } from './handlers/sql-template-literal';
import { SqlDiagnostic, SqlInfo } from './types';
import { getErrorPosition } from './util/error-position';
import { joinTextBlocksAndValues } from './util/textblock-value-join';

export class SqlDiagnosticService {
  private readonly handleQuerriesStartingWith = [
    'select',
    'update',
    'delete',
    'insert into',
    'with',
  ];

  constructor(
    private config: Config,
    private log: LanguageServiceLogger,
    private languageService?: ts.LanguageService,
  ) {}

  private cachedDiagnostic: Record<string, SqlDiagnostic | undefined> = {};

  private makeSha = (sqlInfo: Pick<SqlInfo, 'textBlocks' | 'values'>, costErrorEnabled = true) => {
    const { textBlocks, values } = sqlInfo;
    return createHash('sha1')
      .update(`${JSON.stringify({ textBlocks, values })}${costErrorEnabled}`)
      .digest('base64');
  };

  private getCachedupdateCachedDiagnostic = (
    sqlInfo: Pick<SqlInfo, 'textBlocks' | 'values'>,
    costErrorEnabled = true,
  ) => {
    const sha = this.makeSha(sqlInfo, costErrorEnabled);
    const rtn = this.cachedDiagnostic[sha];
    if (rtn && rtn.ttl < Date.now()) {
      delete this.cachedDiagnostic[sha];
      return undefined;
    }
    return rtn;
  };

  private updateCachedDiagnostic = (sqlDiagnostics: SqlDiagnostic) => {
    const sha = this.makeSha(sqlDiagnostics, sqlDiagnostics.costErrorEnabled);
    if (this.cachedDiagnostic[sha]) delete this.cachedDiagnostic[sha];
    if (
      sqlDiagnostics.diagnostic.category !== ts.DiagnosticCategory.Error &&
      sqlDiagnostics.diagnostic.category !== ts.DiagnosticCategory.Warning
    ) {
      this.cachedDiagnostic[sha] = sqlDiagnostics;
      this.log.debug('cached sql diagnostics');
      this.log.debug(() => ['  - sha:', sha]);
      this.log.debug(() => ['  - sqlInfo:', { ...sqlDiagnostics, diagnostic: undefined }]);
      this.log.debug(() => ['  - costErrorEnabled:', sqlDiagnostics.costErrorEnabled]);
      this.log.debug(() => [
        '  - diagnostics info:',
        {
          category: sqlDiagnostics.diagnostic.category,
          code: sqlDiagnostics.diagnostic.code,
          messageText: sqlDiagnostics.diagnostic.messageText,
          start: sqlDiagnostics.diagnostic.start,
          length: sqlDiagnostics.diagnostic.length,
        },
      ]);
    } else {
      this.log.debug('skip error / warning diagnostic caching');
    }
  };

  findSqlNodes = (sourceFile: ts.SourceFile, includeAll = false) => {
    const result: ts.Node[] = [];
    function recurse(node: ts.Node) {
      if (ts.isTaggedTemplateExpression(node) && node.tag.getText() === 'sql') {
        // check if previous line includes disable statment
        const lastLine = getPreviousLine(sourceFile.text, node.getStart());
        if (
          includeAll ||
          lastLine.includes(disableCostErrorKeyword) ||
          !lastLine.includes(disableKeyword)
        ) {
          result.push(node);
        }
      } else {
        ts.forEachChild(node, recurse);
      }
    }
    recurse(sourceFile);
    return result;
  };

  checkSqlNode = (sourceFile: ts.SourceFile, sqlNode: ts.Node, includeQueryInMessage = false) => {
    const sqlNodeText = sqlNode.getText();

    const typeChecker = this.languageService?.getProgram()?.getTypeChecker();

    if (!typeChecker) throw new Error('typechecker not found?');

    const previousLine = getPreviousLine(sourceFile.text, sqlNode.getStart());
    const costErrorEnabled = !previousLine.includes(disableCostErrorKeyword);
    const checkEnabled = !costErrorEnabled || !previousLine.includes(disableKeyword);
    if (!checkEnabled) return undefined;

    this.log.debug(() => [`checkSqlNodes start`]);

    const now = Date.now();

    const sqlInfo = {
      ...SqlTemplteLiteralHandler.handle(typeChecker, sqlNode),
      nodeText: sqlNodeText,
    };

    // generate sql tagged template in textBlock / values matching parts
    let sqlNodeCleanText = '';
    if (ts.isTaggedTemplateExpression(sqlNode)) {
      sqlNodeCleanText = sqlNode.template.getFullText();
      sqlNodeCleanText = sqlNodeCleanText.substr(1, sqlNodeCleanText.length - 2); // remove backticks
    } else if (ts.isTemplateExpression(sqlNode)) {
      sqlNodeCleanText = sqlNode.getFullText();
      sqlNodeCleanText = sqlNodeCleanText.substr(1, sqlNodeCleanText.length - 2); // remove backticks
    }
    const sqlNodeTextParts = sqlInfo.textBlocks.reduce((rtn, text, idx, arr) => {
      const idx1 = sqlNodeCleanText.indexOf(text);
      const idx1End = idx1 + text.length;
      const textMatch = sqlNodeCleanText.substr(0, idx1End);
      rtn.push(textMatch);
      const nextText = idx < arr.length ? arr[idx + 1] : undefined;
      if (nextText) {
        const idx2 = nextText ? sqlNodeCleanText.indexOf(nextText, idx1End) : -1;
        const valuePosMatch = sqlNodeCleanText.substring(idx1 + textMatch.length, idx2);
        rtn.push(valuePosMatch);
        sqlNodeCleanText = sqlNodeCleanText.substr(idx2);
      } else {
        const tail = sqlNodeCleanText.substr(idx1End);
        rtn.push(tail);
      }
      return rtn;
    }, [] as string[]);

    let raw = joinTextBlocksAndValues(sqlInfo);

    // skip empty sql fragments
    if (
      !raw
        .split('\n')
        .map(s => s.trim())
        .join('')
    ) {
      return undefined;
    }

    let explain = `explain\n${raw}`;

    // check for cached result
    const cached = this.getCachedupdateCachedDiagnostic(sqlInfo, costErrorEnabled);
    if (cached) {
      this.log.debug(() => [
        `using cached diagnositic data:`,
        { ...cached, diagnostic: undefined },
      ]);
      return cached.diagnostic;
    }

    this.log.debug(() => ['raw:\n', raw]);
    this.log.debug(() => ['explain:\n', explain]);
    this.log.debug(() => ['textBlocks:\n', JSON.stringify(sqlInfo.textBlocks, null, 2)]);
    this.log.debug(() => ['values:\n', JSON.stringify(sqlInfo.values, null, 2)]);

    const addDiagnostic = (
      sqlInfoPartial: Pick<SqlInfo, 'nodeText' | 'textBlocks' | 'values'>,
      category: ts.DiagnosticCategory,
      messageText: string,
      position?: { start: number; length: number },
      isCostErrorEnabled = true,
    ) => {
      if (!position && category === ts.DiagnosticCategory.Suggestion) {
        position = {
          start: -sqlNode.parent.getText().indexOf(sqlNode.getText()) - 1,
          length: 3, // vscode seems to always set length to 1 when diagnostic category is suggestion
        };
      }
      const sqlDiagnostic: SqlDiagnostic = {
        ...sqlInfoPartial,
        raw,
        explain,
        ttl: Date.now() + 60000, // todo: add to config
        diagnostic: {
          file: sourceFile,
          start: position?.start ?? 0,
          length: position?.length ?? sqlNode.getEnd() - sqlNode.getStart(),
          source: 'ts-slonik-plugin',
          code: disablerErrorCode,
          category: !isCostErrorEnabled ? ts.DiagnosticCategory.Suggestion : category,
          messageText,
        },
        costErrorEnabled: isCostErrorEnabled,
      };
      this.updateCachedDiagnostic(sqlDiagnostic);
      this.log.debug(() => [`took`, Date.now() - now]);
      return sqlDiagnostic.diagnostic;
    };

    const rawStrippedComments = raw
      .replace(new RegExp('--.+$', 'gm'), '')
      .replace(new RegExp('/\\*.+\\*/', 's'), '');
    const leadingWhiteSpace = rawStrippedComments.match(/^\s+/)?.[0] || '';
    const rawWithoutLeadingWhitespace = rawStrippedComments
      .toLowerCase()
      .replace(leadingWhiteSpace, '');

    const skippedDiagnosticReason = this.handleQuerriesStartingWith.filter(q =>
      rawWithoutLeadingWhitespace.startsWith(q),
    );
    if (skippedDiagnosticReason.length === 0) {
      return addDiagnostic(
        sqlInfo,
        ts.DiagnosticCategory.Suggestion,
        `fragment starting with \`${
          rawWithoutLeadingWhitespace.match(/^([\w-]+)/)?.[0]
        }\` are not diagnosed`,
      );
    }

    let queryRes: QueryResult<any> | undefined;
    let pgError: PgError | undefined;

    // typle of type and replacement values
    const retryPattern: [string, string][] = [
      ['uuid', '00000000-0000-0000-0000-000000000000'],
      ['inet', '0.0.0.0'],
    ];

    const queryWithRetry = () => {
      try {
        queryRes = pgQuery(this.config, explain);
      } catch (error: any) {
        pgError = error;
      }

      retryPattern.forEach(([type, value]) => {
        if (pgError?.message.includes(`invalid input syntax for type ${type}`)) {
          const regex = new RegExp(`invalid input syntax for type ${type}: \"(.+)\"`);
          const replaceTarg = pgError.message.match(regex)?.[1];
          const replaceRegex = replaceTarg ? new RegExp(replaceTarg, 'g') : undefined;
          pgError = undefined;
          if (replaceRegex) {
            explain = explain.replace(replaceRegex, value);
            raw = raw.replace(replaceRegex, value);
            queryWithRetry();
          }
        }
      });
    };
    queryWithRetry();

    const queryResStr = queryRes?.rows.map(r => Object.values(r).join('\n')).join('') || '';

    const debugQuery = (query: string) =>
      this.config.debug || includeQueryInMessage ? `\n\ntested with query:\n${query}` : '';

    if (pgError) {
      this.log.debug(() => ['pgError:', pgError?.message]);

      const errorWithPosition = pgError.message.match(new RegExp(/"(.+)"/));
      if (errorWithPosition) {
        this.log.debug(() => ['typeError:', pgError?.message]);
        return addDiagnostic(
          sqlInfo,
          ts.DiagnosticCategory.Error,
          `${pgError.message}${debugQuery(raw)}`,
          getErrorPosition(sqlNode, sqlInfo, sqlNodeTextParts, pgError, errorWithPosition[1]),
        );
      }

      const syntaxErrorAtEnd = pgError.message.match(new RegExp(/syntax error at end of input/));
      if (syntaxErrorAtEnd) {
        this.log.debug(() => ['SyntaxError:', syntaxErrorAtEnd[0]]);
        return addDiagnostic(
          sqlInfo,
          ts.DiagnosticCategory.Error,
          `${syntaxErrorAtEnd[0]}${debugQuery(raw)}`,
          {
            start: sqlNode.end - sqlNode.pos - 3,
            length: 3,
          },
        );
      }

      return addDiagnostic(sqlInfo, ts.DiagnosticCategory.Error, `${pgError}${debugQuery(raw)}`);
    }

    const match = queryResStr.match(this.config.cost.pattern);

    this.log.debug(() => [`result:`, queryResStr]);
    this.log.debug(() => [`match:`, match]);

    if (match) {
      const cost = parseFloat(match[1]);
      this.log.debug(() => [`cost:`, cost]);
      if (this.config.cost.threshold.error && cost > this.config.cost.threshold.error) {
        return addDiagnostic(
          sqlInfo,
          ts.DiagnosticCategory.Error,
          `explain cost error threshold: ${cost}${debugQuery(raw)}`,
          undefined,
          costErrorEnabled,
        );
      }
      if (this.config.cost.threshold.warning && cost > this.config.cost.threshold.warning) {
        return addDiagnostic(
          sqlInfo,
          ts.DiagnosticCategory.Warning,
          `explain cost warning: ${cost}${debugQuery(raw)}`,
          undefined,
          costErrorEnabled,
        );
      }
      if (this.config.cost.info) {
        return addDiagnostic(
          sqlInfo,
          ts.DiagnosticCategory.Suggestion,
          `explain cost is ok: ${cost}${debugQuery(raw)}`,
        );
      }
    }

    return addDiagnostic(
      sqlInfo,
      ts.DiagnosticCategory.Suggestion,
      `explain cost parse failed with pattern ${this.config.cost.pattern}: \nexplain query:${explain}\nresponse:${queryResStr}`,
    );
  };
}
