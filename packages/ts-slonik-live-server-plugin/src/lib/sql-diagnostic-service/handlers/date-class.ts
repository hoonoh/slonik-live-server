import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';

export class DateClassHandler {
  /**
   * returns Date class method name if symbol.escapeName matches any of Date methods
   */
  static isDateClass = (
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    isDeclarationParent = false,
  ) => {
    const dateGetters = [
      'constructor',
      'getDate',
      'getDay',
      'getFullYear',
      'getHours',
      'getMilliseconds',
      'getMinutes',
      'getMonth',
      'getSeconds',
      'getTime',
      'getTimezoneOffset',
      'getUTCDate',
      'getUTCDay',
      'getUTCFullYear',
      'getUTCHours',
      'getUTCMilliseconds',
      'getUTCMinutes',
      'getUTCMonth',
      'getUTCSeconds',
      // 'getYear', // deprecated
      // 'setYear', // deprecated
      'toDateString',
      // 'toGMTString', // deprecated
      'toISOString',
      'toJSON',
      'toLocaleDateString',
      'toLocaleString',
      'toLocaleTimeString',
      'toString',
      'toTimeString',
      'toUTCString',
      'valueOf',
    ] as const;

    type DateMethod = (typeof dateGetters)[number];

    const expressionType = typeChecker.getTypeAtLocation(
      isDeclarationParent ? node : node.getChildAt(0),
    );

    const getAllBaseTypes = (type: ts.BaseType) => {
      const rtn: ts.BaseType[] = [];
      rtn.push(type);
      const baseTypes = type.getBaseTypes();
      baseTypes?.forEach(t => {
        rtn.push(...getAllBaseTypes(t));
      });
      return rtn;
    };

    const symbol = typeChecker.getSymbolAtLocation(node);

    const allBaseTypes = getAllBaseTypes(expressionType)
      .filter(t => t.symbol?.escapedName)
      .map(t => t.symbol.escapedName.toString());

    /* istanbul ignore else */
    if (symbol && (allBaseTypes.includes('Date') || allBaseTypes.includes('DateConstructor'))) {
      if (Array.from<string>(dateGetters).includes(symbol.escapedName.toString())) {
        return symbol.escapedName.toString() as DateMethod;
      }
      /* istanbul ignore else */
      if (symbol.escapedName.toString() === 'now') {
        return 'now';
      }
    }

    return undefined;
  };

  /**
   *
   * @param typeChecker
   * @param node first child of PropertyAccessExpression OR class declaration's parent (for Date extended classes)
   * @param values
   * @param isRaw
   */
  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.Node,
    values: Value[],
    isDeclarationParent = false,
  ) {
    const dateClassMethodName = node
      ? DateClassHandler.isDateClass(
          typeChecker,
          isDeclarationParent ? node : node.parent,
          isDeclarationParent,
        )
      : undefined;

    /* istanbul ignore else */
    if (dateClassMethodName) {
      /* istanbul ignore next */
      LanguageServiceLogger.debug(() => [`* handling identifier as Date.${dateClassMethodName}`]);
      const value = dateClassMethodName === 'now' ? Date.now() : new Date()[dateClassMethodName]();
      values.push({
        value,
        isString: typeof value === 'string',
      });
      return true;
    }
    return false;
  }
}
