import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { TypeByFlagHandler } from './type-by-flag';

export class PropertySignatureHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('property signature');

  static handle(
    typeChecker: ts.TypeChecker,
    node: ts.PropertySignature,
    values: Value[],
    isRaw = false,
  ) {
    if (
      //
      // union / intersection type
      //
      node.type &&
      (ts.isUnionTypeNode(node.type) || ts.isIntersectionTypeNode(node.type)) &&
      node.type.types.length
    ) {
      // choose left most type
      PropertySignatureHandler.debugHandled('union / intersection');
      const t = typeChecker.getTypeAtLocation(node.type.types[0]);
      TypeByFlagHandler.handle(t, values, isRaw);
    } /* istanbul ignore else */ else if (node.type) {
      //
      // type
      //
      PropertySignatureHandler.debugHandled('type');
      const t = typeChecker.getTypeAtLocation(node.type);
      TypeByFlagHandler.handle(t, values, isRaw);
    }
  }
}
