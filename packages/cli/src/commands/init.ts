import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { loadConfig } from '../utils/config';

export async function initCommand() {
  const configPath = path.join(process.cwd(), 'zta.config.yaml');
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('Configuration already exists (zta.config.yaml).'));
    return;
  }
  const config = await loadConfig();
  const yamlString = yaml.dump(config, { indent: 2 });
  fs.writeFileSync(configPath, yamlString);
  console.log(chalk.green(`✓ Created ${configPath}`));
}
