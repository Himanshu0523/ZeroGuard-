import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { Scanner, Finding, RemediationResult } from '@zeroguard/core';
import { loadConfig } from '../utils/config';
import { findFiles } from '../utils/file-walker';

export async function fixCommand(targetPath: string = '.', options: any = {}) {
  const config = await loadConfig(options.config);
  const scanner = new Scanner(config);
  await scanner.initialize();

  const spinner = ora('Scanning for vulnerabilities...').start();
  const target = path.resolve(targetPath);

  let files: string[] = [];
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    files = [target];
  } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    files = await findFiles(config.scan.include, config.scan.exclude, target);
  } else {
    spinner.fail(`Target path does not exist: ${target}`);
    process.exitCode = 1;
    return;
  }

  const allFindings: Finding[] = [];
  for (const file of files) {
    const result = await scanner.scanFile(file);
    allFindings.push(...result.findings);
  }
  spinner.succeed(`Found ${allFindings.length} findings`);

  if (allFindings.length === 0) {
    console.log(chalk.green('No vulnerabilities to fix.'));
    return;
  }

  const actionable = allFindings.filter(f => f.fixes && f.fixes.length > 0);
  if (actionable.length === 0) {
    console.log(chalk.yellow('No applicable fixes available for detected findings.'));
    return;
  }

  console.log(chalk.bold('\nActionable findings:'));
  actionable.forEach((f, idx) => {
    const fix = f.fixes[0];
    console.log(`${idx + 1}. [${f.ruleId}] ${f.file}:${f.line} - ${f.message}`);
    console.log(`   Fix: ${fix?.title}`);
  });

  if (!options.yes) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise<string>(resolve => rl.question('\nApply fixes? (y/N) ', resolve));
    rl.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      return;
    }
  }

  const results: RemediationResult[] = [];
  for (const finding of actionable) {
    const fix = finding.fixes[0];
    if (!fix) continue;

    const fixSpinner = ora(`Fixing ${finding.id}...`).start();
    const originalContent = fs.readFileSync(finding.file, 'utf-8');

    const result = await scanner.remediationEngine.applyAndVerify(finding.file, originalContent, finding, fix);
    if (result.verification.status === 'VERIFIED') {
      const lines = originalContent.split('\n');
      const fixLines = fix.code.split('\n');
      const startLine = Math.max(0, finding.line - 1);
      const endLine = Math.max(0, (finding.endLine || finding.line) - 1);
      const newLines = [...lines.slice(0, startLine), ...fixLines, ...lines.slice(endLine + 1)];
      fs.writeFileSync(finding.file, newLines.join('\n'));
      fixSpinner.succeed(`Fixed and verified: ${finding.id}`);
    } else {
      fixSpinner.warn(`Fix needs review: ${finding.id}`);
    }
    results.push(result);
  }

  const verified = results.filter(r => r.verification.status === 'VERIFIED').length;
  console.log(chalk.green(`\n✓ ${verified} fixes verified and applied`));
  const needsReview = results.length - verified;
  if (needsReview > 0) {
    console.log(chalk.yellow(`⚠ ${needsReview} fixes need manual review`));
  }
}
