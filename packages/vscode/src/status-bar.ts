import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'zeroguard.scan';
    this.statusBarItem.text = '$(shield) ZeroGuard';
    this.statusBarItem.tooltip = 'Click to scan';
    this.statusBarItem.show();
  }

  setState(state: 'idle' | 'scanning' | 'ready' | 'error', message?: string) {
    switch (state) {
      case 'idle':
        this.statusBarItem.text = '$(shield) ZeroGuard';
        this.statusBarItem.color = undefined;
        this.statusBarItem.tooltip = 'ZeroGuard: idle';
        break;
      case 'scanning':
        this.statusBarItem.text = '$(loading~spin) ZeroGuard';
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        this.statusBarItem.tooltip = 'Scanning...';
        break;
      case 'ready':
        this.statusBarItem.text = '$(shield) ZeroGuard: Ready';
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        this.statusBarItem.tooltip = message || 'ZeroGuard: scan completed';
        break;
      case 'error':
        this.statusBarItem.text = '$(error) ZeroGuard';
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        this.statusBarItem.tooltip = message || 'ZeroGuard: error';
        break;
    }
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}
