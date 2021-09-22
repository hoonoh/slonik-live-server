/* eslint-disable class-methods-use-this */
import stringify from 'safe-stable-stringify';
import ts from 'typescript/lib/tsserverlibrary';
import { Logger } from 'typescript-template-language-service-decorator';

type MessageType =
  | string
  | number
  | boolean
  | undefined
  | null
  | MessageType[]
  | Record<string, any>;
// | object;

function isMessageTypeArray(msg: any): msg is MessageType[] {
  return !!msg.map;
}

export class LanguageServiceLogger implements Logger {
  private static debugGroup = 0;

  private static head = '[ts-slonik-plugin] ';

  private static parseMessage(msg: MessageType | MessageType[]) {
    const parser = (m: MessageType) => (typeof m === 'object' ? stringify(m, null, 2) : m);
    if (isMessageTypeArray(msg)) return msg.map(m => parser(m)).join(' ');
    return parser(msg);
  }

  private logger: ts.server.Logger | undefined;

  private static logger: ts.server.Logger | undefined;

  constructor(readonly targetLogger?: ts.server.Logger) {
    this.logger = targetLogger;
    if (process.env.NODE_ENV === 'dev') {
      this.logger = {
        close: () => {},
        hasLevel: () => false,
        loggingEnabled: () => true,
        perftrc: s => {
          console.log(s);
        },
        info: s => {
          console.log(s);
        },
        startGroup: () => {},
        endGroup: () => {},
        msg: s => {
          console.log(s);
        },
        getLogFileName: () => 'dummy_log.txt',
      };
    }

    LanguageServiceLogger.logger = this.logger;
  }

  private static isDebugEnabled = false;

  static debugEnabled(enabled: boolean) {
    LanguageServiceLogger.isDebugEnabled = enabled;
  }

  static log(msg: string) {
    LanguageServiceLogger.logger?.info(`[${LanguageServiceLogger.head}] ${msg}`);
  }

  static debugGroupStart() {
    if (LanguageServiceLogger.isDebugEnabled && LanguageServiceLogger.logger?.loggingEnabled())
      LanguageServiceLogger.debugGroup += 1;
  }

  static debugGroupEnd() {
    if (
      LanguageServiceLogger.isDebugEnabled &&
      LanguageServiceLogger.logger?.loggingEnabled() &&
      LanguageServiceLogger.debugGroup - 1 >= 0
    ) {
      LanguageServiceLogger.debugGroup -= 1;
    }
  }

  static debug(msg: MessageType): void;
  static debug(msgGenerator: () => MessageType | MessageType[]): void;
  static debug(stringOrGenerator: any) {
    if (LanguageServiceLogger.isDebugEnabled) {
      if (typeof stringOrGenerator === 'string') {
        LanguageServiceLogger.logger?.info(
          `${LanguageServiceLogger.head}debug: ${' '.repeat(
            LanguageServiceLogger.debugGroup * 2,
          )}${LanguageServiceLogger.parseMessage(stringOrGenerator)}`,
        );
      } else if (LanguageServiceLogger.logger?.loggingEnabled()) {
        LanguageServiceLogger.logger?.info(
          `${LanguageServiceLogger.head}debug: ${' '.repeat(
            LanguageServiceLogger.debugGroup * 2,
          )}${LanguageServiceLogger.parseMessage(stringOrGenerator())}`,
        );
      }
    }
  }

  static handlerDebugger(handlerName: string) {
    return (handledAs: string) => {
      LanguageServiceLogger.debug(() => `* handling ${handlerName} as ${handledAs}`);
    };
  }

  static info(...msg: MessageType[]) {
    if (LanguageServiceLogger.logger?.loggingEnabled()) {
      LanguageServiceLogger.logger?.info(
        LanguageServiceLogger.head + LanguageServiceLogger.parseMessage(msg),
      );
    }
  }

  static perf(...msg: MessageType[]) {
    if (LanguageServiceLogger.logger?.loggingEnabled()) {
      LanguageServiceLogger.logger?.perftrc(
        LanguageServiceLogger.head + LanguageServiceLogger.parseMessage(msg),
      );
    }
  }

  static error(...msg: MessageType[]) {
    if (LanguageServiceLogger.logger?.loggingEnabled()) {
      LanguageServiceLogger.logger?.msg(
        LanguageServiceLogger.head + LanguageServiceLogger.parseMessage(msg),
        ts.server.Msg.Err,
      );
    }
  }

  // instance methods always call static methods

  log(msg: string) {
    LanguageServiceLogger.log(msg);
  }

  debugGroupStart() {
    LanguageServiceLogger.debugGroupStart();
  }

  debugGroupEnd() {
    LanguageServiceLogger.debugGroupEnd();
  }

  debug(msg: MessageType): void;
  debug(msgGenerator: () => MessageType | MessageType[]): void;
  debug(stringOrGenerator: any) {
    LanguageServiceLogger.debug(stringOrGenerator);
  }

  info(...msg: MessageType[]) {
    LanguageServiceLogger.info(...msg);
  }

  perf(...msg: MessageType[]) {
    LanguageServiceLogger.perf(...msg);
  }

  error(...msg: MessageType[]) {
    LanguageServiceLogger.error(...msg);
  }
}
