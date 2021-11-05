import { ExtensionContext } from 'vscode';

export function activate(context: ExtensionContext) {
  console.log('>>>activate', JSON.stringify(context, null, 2));
}

export function deactivate() {
  console.log('>>>deactivate');
}
