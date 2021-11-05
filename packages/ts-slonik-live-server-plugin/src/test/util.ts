import { readFileSync } from 'fs';
import { basename } from 'path';
import ts from 'typescript/lib/tsserverlibrary';

import { Config } from '../lib/config';
import { SqlLanguageService } from '../lib/language-service';
import { LanguageServiceLogger } from '../lib/logger';
import { PgInfoService } from '../lib/pg-info-service';
import { SqlDiagnosticService } from '../lib/sql-diagnostic-service';

export type File = {
  fileName: string;
  path: string;
  text: string;
};

export const mockService = (files: Readonly<File[]>, debug?: boolean) => {
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      // add node.js typing lib
      // add slonik
      // add slonik-sql-tag-raw
      lib: [
        'lib.esnext.full.d.ts',
        '../../@types/node/index.d.ts',
        '../../slonik/dist/src/index.d.ts',
        '../../slonik-sql-tag-raw/dist/sqlTags/raw.d.ts',
      ],
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.Latest,
    }),
    getCurrentDirectory: () => __dirname,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => files.map(file => file.fileName),
    getScriptSnapshot: fileName => {
      const text =
        files.find(f => f.fileName === fileName)?.text || readFileSync(fileName).toString();
      return {
        getChangeRange: () => undefined,
        getLength: () => text?.length || 0,
        getText: (start, end) => text?.substring(start, end) || '',
      };
    },
    getScriptVersion: () => '1',
  };

  const languageService = ts.createLanguageService(host);

  const logger: ts.server.Logger = {
    close: function (): void {
      //
    },
    hasLevel: function (): boolean {
      return true;
    },
    loggingEnabled: function (): boolean {
      return true;
    },
    perftrc: function (s: string): void {
      console.log(s);
    },
    info: function (s: string): void {
      console.log(s);
    },
    startGroup: function (): void {
      console.group();
    },
    endGroup: function (): void {
      console.groupEnd();
    },
    msg: function (s: string, type?: ts.server.Msg): void {
      console.log(`[${type}] ${s}`);
    },
    getLogFileName: function (): string | undefined {
      return undefined;
    },
  };

  const log = new LanguageServiceLogger(debug ? logger : undefined);
  const config = new Config();
  config.load({
    pg: {
      uri: 'postgresql://postgres:secretpassword@localhost:54321/postgres',
      include: {
        schema: ['schema1'],
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
    debug: true,
  });

  LanguageServiceLogger.debugEnabled(config.debug);

  const pgInfoService = new PgInfoService(config, log);
  pgInfoService.loadDbInfo();
  const sqlDiagnosticService = new SqlDiagnosticService(config, log, languageService);
  const sqlLanguageService = new SqlLanguageService(pgInfoService, sqlDiagnosticService, log);

  return {
    languageService,
    pgInfoService,
    sqlDiagnosticService,
    sqlLanguageService,
  };
};

export const getFiles = (filePaths: string[]) =>
  filePaths.map(
    path => ({ path, fileName: basename(path), text: readFileSync(path).toString() } as File),
  );

export type TestTarget = [title: string, sourceFile: ts.SourceFile, node: ts.Node];

const getTitleFromNode = (node: ts.Node) => {
  let title = node
    .getText()
    .split('\n')
    .map(t => t.trim())
    .join(' ');
  const maxLen = 40;
  if (title.length > maxLen) title = `${title.slice(0, maxLen)}...`;
  return title;
};

/**
 *
 * @param languageService
 * @param sqlDiagnosticService
 * @param files
 * @param includeAll include all nodes with ignore comment
 * @returns
 */
export const getTestTargets = (
  languageService: ts.LanguageService,
  sqlDiagnosticService: SqlDiagnosticService,
  files: File[],
  includeAll = false,
) =>
  files.reduce((rtn, file) => {
    const sourceFile = languageService.getProgram()?.getSourceFile(file.fileName);
    if (!sourceFile) throw new Error('no sourceFile');
    const sqlNodes = sqlDiagnosticService.findSqlNodes(sourceFile, includeAll);
    sqlNodes.forEach(node => {
      rtn.push([getTitleFromNode(node), sourceFile, node]);
    });
    return rtn;
  }, [] as TestTarget[]);

export type DiagnosticFromFileResult = [title: string, diagnostic: ts.Diagnostic, index: number];

export const getDiagnosticFromSourceText = (text: string): DiagnosticFromFileResult[] => {
  const fileName = `${Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, '0')}.ts`;
  const file: File = {
    fileName,
    path: `./${fileName}`,
    text,
  };
  const { languageService, sqlDiagnosticService } = mockService([file]);
  const testTargets = getTestTargets(languageService, sqlDiagnosticService, [file]);
  const diagnostics = testTargets.reduce((rtn, [, sourceFile, node]) => {
    const diagnostic = sqlDiagnosticService.checkSqlNode(sourceFile, node, true);
    if (diagnostic) rtn.push([node, diagnostic]);
    return rtn;
  }, [] as [ts.Node, ts.Diagnostic][]);
  return diagnostics.map(([n, d], idx) => [getTitleFromNode(n), d, idx]);
};
