import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import * as path from 'path';

let client: LanguageClient;

export function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', '@zeroguard', 'lsp', 'dist', 'server.js')
  );

  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'yaml' },
      { scheme: 'file', language: 'json' }
    ],
    synchronize: {
      configurationSection: 'zeroguard',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,yaml,yml,json}')
    },
    initializationOptions: {
      configuration: getConfiguration()
    }
  };

  client = new LanguageClient('zeroguard', 'ZeroGuard API Security Scanner', serverOptions, clientOptions);
  return client;
}

function getConfiguration(): any {
  const config = vscode.workspace.getConfiguration('zeroguard');
  return {
    enableOnSave: config.get('enableOnSave', true),
    severity: config.get('severity', 'low'),
    autoFix: config.get('autoFix', false)
  };
}
