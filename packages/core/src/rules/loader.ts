import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Rule } from '../types';

export class RuleLoader {
  async loadFromFile(filePath: string): Promise<Rule> {
    const content = await fs.readFile(filePath, 'utf-8');
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return yaml.load(content) as Rule;
    } else if (filePath.endsWith('.json')) {
      return JSON.parse(content) as Rule;
    } else {
      throw new Error(`Unsupported rule file format: ${path.extname(filePath)}`);
    }
  }

  async loadFromDirectory(dirPath: string): Promise<Rule[]> {
    const files = await fs.readdir(dirPath);
    const rules: Rule[] = [];
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
        const rule = await this.loadFromFile(path.join(dirPath, file));
        rules.push(rule);
      }
    }
    return rules;
  }
}
