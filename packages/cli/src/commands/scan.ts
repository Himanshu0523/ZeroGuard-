import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { Scanner, ScanResult, Finding } from '@zeroguard/core';
import { loadConfig } from '../utils/config';
import { findFiles } from '../utils/file-walker';
import { TextReporter } from '../reporters/text-reporter';
import { JSONReporter } from '../reporters/json-reporter';
import { SARIFReporter } from '../reporters/sarif-reporter';
import { HTMLReporter } from '../reporters/html-reporter';

interface ScanOptions {
  config?: string;
  format?: 'text' | 'json' | 'sarif' | 'html';
  output?: string;
  watch?: boolean;
  fix?: boolean;
  baseline?: string;
  severity?: string;
}

export async function scanCommand(targetPath: string, options: ScanOptions): Promise<void> {
  const config = await loadConfig(options.config);
  if (options.format) config.report.format = options.format as any;
  if (options.output) config.report.output = options.output;
  if (options.severity) config.rules.owaspApiTop10.severity = options.severity as any;

  const scanner = new Scanner(config);
  await scanner.initialize();

  const spinner = ora('Scanning...').start();
  const startTime = Date.now();

  let filesToScan: string[] = [];
  const target = path.resolve(targetPath);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    filesToScan = [target];
  } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    filesToScan = await findFiles(config.scan.include, config.scan.exclude, target);
  } else {
    spinner.fail(`Target path does not exist: ${target}`);
    process.exitCode = 1;
    return;
  }

  const allFindings: Finding[] = [];
  for (const file of filesToScan) {
    const result = await scanner.scanFile(file);
    allFindings.push(...result.findings);
  }

  const duration = Date.now() - startTime;
  spinner.succeed(`Scan complete in ${duration}ms`);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const minSev = severityOrder[(config.rules.owaspApiTop10.severity as keyof typeof severityOrder) || 'low'] ?? 3;
  const filtered = allFindings.filter(f => (severityOrder[f.severity] ?? 4) <= minSev);

  const scanResult: ScanResult = {
    timestamp: new Date().toISOString(),
    durationMs: duration,
    filesScanned: filesToScan.length,
    findings: filtered,
    summary: {
      critical: filtered.filter(f => f.severity === 'critical').length,
      high: filtered.filter(f => f.severity === 'high').length,
      medium: filtered.filter(f => f.severity === 'medium').length,
      low: filtered.filter(f => f.severity === 'low').length,
      info: filtered.filter(f => f.severity === 'info').length
    },
    rulesChecked: scanner.ruleEvaluator?.rules.length || 0
  };

  let reporter;
  switch (config.report.format) {
    case 'json': reporter = new JSONReporter(); break;
    case 'sarif': reporter = new SARIFReporter(); break;
    case 'html': reporter = new HTMLReporter(); break;
    default: reporter = new TextReporter();
  }

  const output = reporter.report(scanResult);

  if (config.report.output) {
    fs.mkdirSync(path.dirname(path.resolve(config.report.output)), { recursive: true });
    fs.writeFileSync(path.resolve(config.report.output), output);
    console.log(chalk.green(`Report saved to ${config.report.output}`));
  } else {
    console.log(output);
  }

  if (filtered.length > 0) {
    process.exitCode = 1;
  }

  if (options.watch) {
    console.log(chalk.gray('Watching for changes...'));
    const watcher = fs.watch(target, { recursive: true }, async (_eventType, filename) => {
      if (!filename) return;
      console.log(chalk.gray(`File changed: ${filename}`));
      await scanCommand(targetPath, { ...options, watch: false });
    });
    process.on('SIGINT', () => {
      watcher.close();
      process.exit();
    });
  }
}
