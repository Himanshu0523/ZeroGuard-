import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ScannerConfig } from '../types';

export class ConfigLoader {
  static async load(configPath: string): Promise<ScannerConfig> {
    const fullPath = path.resolve(configPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Config file not found: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (fullPath.endsWith('.yaml') || fullPath.endsWith('.yml')) {
      return yaml.load(content) as ScannerConfig;
    } else if (fullPath.endsWith('.json')) {
      return JSON.parse(content) as ScannerConfig;
    } else {
      throw new Error(`Unsupported config format: ${path.extname(fullPath)}`);
    }
  }

  static getDefaultConfig(): ScannerConfig {
    return {
      rules: {
        owaspApiTop10: {
          enabled: true,
          severity: 'low'
        }
      },
      scan: {
        include: ['src/**/*.ts', 'src/**/*.js', 'openapi.yaml', 'openapi.json'],
        exclude: ['**/*.test.ts', '**/*.spec.ts', 'node_modules', 'dist']
      },
      report: {
        format: 'text',
        output: '.zeroguard/results.json'
      },
      fix: {
        autoFix: false,
        aiAssisted: false
      }
    };
  }
}
