import ts from 'typescript/lib/tsserverlibrary';

import { Value } from '../types';
import { TypeByFlagHandler } from './type-by-flag';

export class TypeReferenceHandler {
  static handle(typeChecker: ts.TypeChecker, node: ts.Node, values: Value[], isRaw = false) {
    const type = typeChecker.getTypeAtLocation(node);
    if (type.isUnion() || type.isIntersection()) {
      // look for handleable types by type by flag handler
      const handlableByTypeflag = type.types.find(t => TypeByFlagHandler.handlable(t));
      /* istanbul ignore else */
      if (handlableByTypeflag) TypeByFlagHandler.handle(handlableByTypeflag, values, isRaw);
    } /* istanbul ignore else */ else if (type.isLiteral()) {
      TypeByFlagHandler.handle(type, values, isRaw);
    }
  }
}
