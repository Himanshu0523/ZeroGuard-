import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export function registerCommands(context: vscode.ExtensionContext, client: LanguageClient) {
  context.subscriptions.push(
    vscode.commands.registerCommand('zeroguard.scan', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('ZeroGuard: No file open');
        return;
      }
      const doc = editor.document;
      const uri = doc.uri.toString();
      await client.sendNotification('zeroguard/forceScan', { uri });
      vscode.window.showInformationMessage('ZeroGuard: Scan initiated');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zeroguard.showRules', () => {
      const panel = vscode.window.createWebviewPanel(
        'zeroguardRules',
        'ZeroGuard OWASP Rules',
        vscode.ViewColumn.Beside,
        { enableScripts: false }
      );
      panel.webview.html = getRulesHtml();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zeroguard.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:zeroguard.zeroguard');
    })
  );
}

function getRulesHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #333; }
    .rule { margin: 15px 0; padding: 10px; border-left: 4px solid #007acc; }
    .rule.critical { border-left-color: #dc2626; }
    .rule.high { border-left-color: #f59e0b; }
    .rule-name { font-weight: bold; }
    .rule-desc { color: #555; }
  </style>
</head>
<body>
  <h1>OWASP API Security Top 10</h1>
  <div class="rule critical"><div class="rule-name">API1: Broken Object Level Authorization</div><div class="rule-desc">Missing ownership checks on resource access</div></div>
  <div class="rule critical"><div class="rule-name">API2: Broken Authentication</div><div class="rule-desc">Weak or missing authentication</div></div>
  <div class="rule high"><div class="rule-name">API3: Broken Object Property Level Authorization</div><div class="rule-desc">Sensitive fields exposed in responses</div></div>
  <div class="rule high"><div class="rule-name">API4: Unrestricted Resource Consumption</div><div class="rule-desc">No rate limiting or pagination</div></div>
  <div class="rule high"><div class="rule-name">API5: Broken Function Level Authorization</div><div class="rule-desc">Admin actions without role checks</div></div>
  <div class="rule medium"><div class="rule-name">API8: Security Misconfiguration</div><div class="rule-desc">CORS *, verbose errors, missing TLS</div></div>
</body>
</html>`;
}
