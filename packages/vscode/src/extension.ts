import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { createLanguageClient } from './client';
import { StatusBarManager } from './status-bar';
import { registerCommands } from './commands';

let client: LanguageClient;
let statusBar: StatusBarManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log('ZeroGuard extension activated');
  statusBar = new StatusBarManager();
  statusBar.setState('idle');

  client = createLanguageClient(context);
  try {
    await client.start();
    statusBar.setState('ready');
  } catch (err) {
    console.error('Failed to start ZeroGuard LSP server', err);
    statusBar.setState('error', 'Failed to start');
    vscode.window.showErrorMessage('ZeroGuard: Failed to start scanner');
    return;
  }

  registerCommands(context, client);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('zeroguard')) {
        client.sendNotification('workspace/didChangeConfiguration', {
          settings: vscode.workspace.getConfiguration('zeroguard')
        });
        statusBar.setState('ready');
      }
    })
  );

  client.onDidChangeState(e => {
    if (e.newState === 2 /* Running */) {
      statusBar.setState('ready');
    } else if (e.newState === 3 /* Stopped */) {
      statusBar.setState('error', 'Stopped');
    }
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
