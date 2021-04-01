import ts from 'typescript/lib/tsserverlibrary';

import { LanguageServiceLogger } from '../../logger';
import { Value } from '../types';
import { KindHandler } from './kind';
import { PrimitiveHandler } from './primitive';
import { TypeByFlagHandler } from './type-by-flag';

export class FunctionHandler {
  private static debugHandled = LanguageServiceLogger.handlerDebugger('function');

  static getFunctionBody = (declaration: ts.Declaration) => {
    let body: ts.ConciseBody | undefined;
    if (
      //
      // function / arrow function
      //
      (declaration && (ts.isFunctionDeclaration(declaration) || ts.isArrowFunction(declaration))) ||
      ts.isMethodDeclaration(declaration)
    ) {
      body = declaration.body;
    } else if (
      //
      // function / arrow function from property / variable
      //
      declaration &&
      (ts.isPropertyDeclaration(declaration) || ts.isVariableDeclaration(declaration)) &&
      declaration.initializer &&
      (ts.isFunctionDeclaration(declaration.initializer) ||
        ts.isArrowFunction(declaration.initializer))
    ) {
      body = declaration.initializer.body;
    }
    return body;
  };

  static handle = (
    typeChecker: ts.TypeChecker,
    declaration: ts.Declaration,
    values: Value[],
    isRaw = false,
  ) => {
    const body = FunctionHandler.getFunctionBody(declaration);

    /* istanbul ignore else */
    if (body) {
      if (ts.isBlock(body)) {
        const returnType = body.statements.filter(c => ts.isReturnStatement(c)).pop();
        /* istanbul ignore else */
        if (
          //
          // return statement primitive
          //
          returnType &&
          ts.isReturnStatement(returnType) &&
          returnType.expression
        ) {
          FunctionHandler.debugHandled('return statement primitive');
          PrimitiveHandler.handle(returnType.expression, values, isRaw);
        }
      } else if (
        //
        // no substitution template literal
        //
        ts.isNoSubstitutionTemplateLiteral(body)
      ) {
        FunctionHandler.debugHandled('no substitution template literal');
        values.push({ value: body.text, isString: isRaw ? undefined : true });
      } else if (
        //
        // template expression
        //
        ts.isTemplateExpression(body)
      ) {
        FunctionHandler.debugHandled('template expression');
        values.push({ value: 'a', isString: isRaw ? undefined : true });
      } else {
        //
        // primitive value
        //
        FunctionHandler.debugHandled('primitive value');
        PrimitiveHandler.handle(body, values, isRaw);
      }
    } else if (
      //
      // method signature
      //
      ts.isMethodSignature(declaration) &&
      declaration.type
    ) {
      FunctionHandler.debugHandled('method signature type kind');
      KindHandler.handle(declaration.type.kind, values, undefined, isRaw);
    } else {
      const type = typeChecker.getTypeAtLocation(declaration);
      if (
        //
        // declaration type
        //
        type
      ) {
        FunctionHandler.debugHandled('declaration type');
        TypeByFlagHandler.handle(type, values);
      } else {
        //
        // unhandled
        //
        FunctionHandler.debugHandled('UNHANDLED');
      }
    }
  };
}
