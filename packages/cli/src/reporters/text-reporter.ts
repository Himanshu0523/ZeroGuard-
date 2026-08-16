import chalk from 'chalk';
import { ScanResult } from '@zeroguard/core';

export class TextReporter {
  report(result: ScanResult): string {
    let output = '';
    output += '\n' + chalk.bold('ZeroGuard API Security Scanner') + '\n';
    output += chalk.gray('─'.repeat(60)) + '\n\n';

    output += chalk.bold('Summary\n');
    output += `  Files scanned: ${result.filesScanned}\n`;
    output += `  Rules checked: ${result.rulesChecked}\n`;
    output += `  Duration: ${result.durationMs}ms\n`;
    output += `  Findings: ${result.findings.length}\n\n`;

    output += chalk.bold('Severity Breakdown\n');
    output += chalk.red(`  Critical: ${result.summary.critical}\n`);
    output += chalk.yellow(`  High:     ${result.summary.high}\n`);
    output += chalk.blue(`  Medium:   ${result.summary.medium}\n`);
    output += chalk.cyan(`  Low:      ${result.summary.low}\n`);
    output += chalk.gray(`  Info:     ${result.summary.info}\n\n`);

    if (result.findings.length === 0) {
      output += chalk.green('✓ No vulnerabilities found!\n');
    } else {
      output += chalk.bold('Findings\n');
      output += chalk.gray('─'.repeat(60)) + '\n\n';

      const grouped = result.findings.reduce<Record<string, typeof result.findings>>((acc, f) => {
        acc[f.file] = acc[f.file] || [];
        acc[f.file].push(f);
        return acc;
      }, {});

      for (const [file, findings] of Object.entries(grouped)) {
        output += chalk.bold(`📄 ${file}\n`);
        for (const f of findings) {
          const icon = this.severityIcon(f.severity);
          output += `  ${icon} [${f.ruleId}] ${f.ruleName}\n`;
          output += `     Line ${f.line}:${f.column}\n`;
          output += `     ${chalk.gray(f.message)}\n`;
          output += `     Confidence: ${(f.confidence * 100).toFixed(0)}%\n`;
          output += `     ${chalk.green('Fix:')} ${f.fixes[0]?.title || 'Manual review'}\n\n`;
        }
      }
    }

    output += chalk.gray('─'.repeat(60)) + '\n';
    output += `Generated: ${result.timestamp}\n\n`;
    return output;
  }

  private severityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return chalk.red('🔴');
      case 'high': return chalk.yellow('🟠');
      case 'medium': return chalk.blue('🔵');
      case 'low': return chalk.cyan('◯');
      default: return chalk.gray('◯');
    }
  }
}
