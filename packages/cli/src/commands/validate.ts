import * as fs from 'fs';
import chalk from 'chalk';
import yaml from 'js-yaml';

export async function validateCommand(configPath?: string) {
  const file = configPath || 'zta.config.yaml';
  if (!fs.existsSync(file)) {
    console.error(chalk.red(`Config file not found: ${file}`));
    process.exitCode = 1;
    return;
  }
  try {
    const content = fs.readFileSync(file, 'utf-8');
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      yaml.load(content);
    } else {
      JSON.parse(content);
    }
    console.log(chalk.green(`✓ ${file} is valid`));
  } catch (err: any) {
    console.error(chalk.red(`Invalid configuration: ${err.message}`));
    process.exitCode = 1;
  }
}
