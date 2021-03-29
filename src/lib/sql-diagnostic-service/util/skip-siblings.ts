import ts from 'typescript/lib/tsserverlibrary';

export const skipSiblings = (node: ts.Node, skipAtPosition: number[]) => {
  node.parent?.getChildren().forEach(c => {
    if (!ts.isTemplateLiteralToken(c)) {
      skipAtPosition.push(c.getStart());
    }
  });
};
