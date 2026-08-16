import { Command } from 'commander';
import { scanCommand } from './commands/scan';
import { initCommand } from './commands/init';
import { validateCommand } from './commands/validate';
import { fixCommand } from './commands/fix';

const program = new Command();

program
  .name('zta')
  .description('ZeroGuard - Zero-Trust API Security Scanner')
  .version('0.0.1');

program
  .command('scan [path]')
  .description('Scan API files for OWASP vulnerabilities')
  .option('-c, --config <file>', 'Config file path')
  .option('-f, --format <type>', 'Output format: text|json|sarif|html', 'text')
  .option('-o, --output <file>', 'Output file path')
  .option('-w, --watch', 'Watch mode')
  .option('-s, --severity <level>', 'Minimum severity (critical|high|medium|low|info)', 'low')
  .action(async (target = '.', options) => {
    await scanCommand(target, options);
  });

program
  .command('fix [path]')
  .description('Apply and verify fixes for vulnerabilities')
  .option('-c, --config <file>', 'Config file path')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (target = '.', options) => {
    await fixCommand(target, options);
  });

program
  .command('init')
  .description('Initialize ZeroGuard configuration')
  .action(async () => {
    await initCommand();
  });

program
  .command('validate [config]')
  .description('Validate configuration file')
  .action(async (config) => {
    await validateCommand(config);
  });

program.parseAsync(process.argv);
