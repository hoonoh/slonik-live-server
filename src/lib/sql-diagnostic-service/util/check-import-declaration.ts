import ts from 'typescript/lib/tsserverlibrary';

const checkImportDeclaration = (importDeclaration: ts.Node, packageName: string) => {
  if (
    importDeclaration &&
    ts.isImportDeclaration(importDeclaration) &&
    ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
    importDeclaration.moduleSpecifier.text === packageName
  ) {
    return true;
  }
  return false;
};

/**
 * checks if import declaration module specifier matches given packageName
 * and returns expression text; else returns undefined.
 */
export const checkTemplateSpanImportDeclaration = (
  typeChecker: ts.TypeChecker,
  templateSpan: ts.TemplateSpan,
  packageName = 'slonik',
) => {
  if (ts.isCallExpression(templateSpan.expression)) {
    let importDeclaration: ts.Node | undefined;
    if (ts.isPropertyAccessExpression(templateSpan.expression.expression)) {
      importDeclaration = typeChecker.getSymbolAtLocation(
        templateSpan.expression.expression.expression,
      )?.declarations?.[0]?.parent?.parent?.parent;
    } else if (ts.isIdentifier(templateSpan.expression.expression)) {
      importDeclaration = typeChecker.getSymbolAtLocation(templateSpan.expression.expression)
        ?.declarations?.[0]?.parent?.parent?.parent;
    }

    if (importDeclaration && checkImportDeclaration(importDeclaration, packageName)) {
      return templateSpan.expression.getText();
    }
  }
  return undefined;
};

/**
 * checks if import declaration module specifier matches given packageName
 * and returns true / false
 */
export const checkSymbolImportDeclaration = (
  typeChecker: ts.TypeChecker,
  symbol: ts.Symbol,
  packageName = 'slonik',
) => {
  let importDeclaration: ts.Node | undefined;

  if (
    symbol &&
    (ts.isVariableDeclaration(symbol.valueDeclaration) ||
      ts.isParameter(symbol.valueDeclaration)) &&
    symbol.valueDeclaration.initializer &&
    ts.isTaggedTemplateExpression(symbol.valueDeclaration.initializer) &&
    (ts.isNoSubstitutionTemplateLiteral(symbol.valueDeclaration.initializer.template) ||
      ts.isTemplateExpression(symbol.valueDeclaration.initializer.template))
  ) {
    importDeclaration = typeChecker.getSymbolAtLocation(symbol.valueDeclaration.initializer.tag)
      ?.declarations?.[0].parent?.parent?.parent;
  }

  if (importDeclaration) return checkImportDeclaration(importDeclaration, packageName);
  return false;
};
