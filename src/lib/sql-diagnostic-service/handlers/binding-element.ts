import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { EnumMemberHandler } from './enum-member';
import { TypeByFlagHandler } from './type-by-flag';

export class BindingElementHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('binding element');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.BindingElement,
    values: Value[],
    isRaw = false,
  ) {
    const type = typeChecker.getTypeAtLocation(node);

    if (type.symbol && ts.isEnumMember(type.symbol.valueDeclaration)) {
      BindingElementHandler.debugHandled('enum member');
      EnumMemberHandler.handle(type.symbol.valueDeclaration, values, isRaw);
    } else {
      BindingElementHandler.debugHandled('type');
      TypeByFlagHandler.handle(type, values, isRaw);
    }
  }
}
