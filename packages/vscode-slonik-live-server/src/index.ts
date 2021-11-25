import { DeepPartial } from 'ts-essentials';
import { PluginConfig } from 'ts-slonik-live-server-plugin/dist/lib/config';
import { ExtensionContext, extensions, window, workspace } from 'vscode';

const output = window.createOutputChannel('Slonik Live Server');

const configKeys = [
  'debug',
  'dotEnv',
  'cost.pattern',
  'cost.info',
  'cost.threshold.error',
  'cost.threshold.warning',
  'pg.uri',
  'pg.defaultSchema',
  'pg.infoTtl',
  'pg.include.schema',
  'pg.include.table',
  'pg.exclude.table',
] as const;

interface ConfigProps extends Partial<Record<typeof configKeys[number], any>> {
  debug?: boolean;
  dotEnv?: string;
  'cost.pattern'?: string;
  'cost.info'?: boolean;
  'cost.threshold.error'?: number;
  'cost.threshold.warning'?: number;
  'pg.uri'?: string;
  'pg.defaultSchema'?: string;
  'pg.infoTtl'?: number;
  'pg.include.schema'?: string[];
  'pg.include.table'?: string[];
  'pg.exclude.table'?: string[];
}

const config: ConfigProps = {};

const syncConfig = (api: any) => {
  const before = JSON.stringify(config);
  configKeys.forEach(k => {
    const conf = workspace.getConfiguration('slonikLiveServer').get(k);

    // handle dotEnv file workspaceFolder
    if (k === 'dotEnv' && typeof conf === 'string' && conf.includes('${workspaceFolder')) {
      // with scope
      let [, workspaceFolderName, filePath] = conf.match(/\$\{workspaceFolder\:(.+)\}(.+)/) || [];
      if (!workspaceFolderName || !filePath) {
        // without scope
        [, workspaceFolderName, filePath] = conf.match(/\$\{workspaceFolder\}(.+)/) || [];
      }
      if (!workspaceFolderName || !filePath) {
        config[k] = conf;
        return;
      }
      const workspaceFolder = workspace.workspaceFolders?.find(w => w.name === workspaceFolderName);
      if (workspaceFolder) {
        config[k] = `${workspaceFolder.uri.fsPath}${filePath}`;
        return;
      }
      config[k] = conf;
    } else if (conf !== undefined) {
      config[k] = conf as any;
    }
  });
  if (before !== JSON.stringify(config)) {
    const newConfig: DeepPartial<PluginConfig> = {
      debug: config.debug,
      dotEnv: config.dotEnv,
      cost: {
        pattern: config['cost.pattern'],
        info: config['cost.info'],
        threshold: {
          error: config['cost.threshold.error'],
          warning: config['cost.threshold.warning'],
        },
      },
      pg: {
        uri: config['pg.uri'],
        defaultSchema: config['pg.defaultSchema'],
        infoTtl: config['pg.infoTtl'],
        include: {
          schema: config['pg.include.schema'],
          table: config['pg.include.table'],
        },
        exclude: {
          table: config['pg.exclude.table'],
        },
      },
      disableKeyword: 'slonik-live-server-disable',
      disableCostErrorKeyword: 'slonik-live-server-disable-cost-errors',
    };
    const configOutput = JSON.stringify(config, null, 2);
    const [, , password] = configOutput.match(/postgresql\:\/\/(.+)\:(.+)@/) || ['', '', ''];
    output.appendLine(
      `loaded config:\n${configOutput.replace(password, '*'.repeat(password.length))}`,
    );
    api.configurePlugin('ts-slonik-live-server-plugin', newConfig);
    return;
  }
  output.appendLine(`config unchanged\n${before}\n${JSON.stringify(config)}`);
};

export async function activate(context: ExtensionContext) {
  const tsExtension = extensions.getExtension('vscode.typescript-language-features');
  if (!tsExtension) return;

  await tsExtension.activate();

  const api = tsExtension.exports.getAPI(0);
  if (!api) return;

  syncConfig(api);

  workspace.onDidChangeConfiguration(
    e => {
      if (e.affectsConfiguration('slonikLiveServer')) syncConfig(api);
    },
    undefined,
    context.subscriptions,
  );
}
