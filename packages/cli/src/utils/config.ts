import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ScannerConfig } from '@zeroguard/core';

export async function loadConfig(configPath?: string): Promise<ScannerConfig> {
  const defaultConfig: ScannerConfig = {
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

  if (!configPath) {
    const candidates = ['zta.config.yaml', 'zta.config.yml', 'zta.config.json', '.zeroguardrc.json'];
    for (const candidate of candidates) {
      if (fs.existsSync(path.resolve(process.cwd(), candidate))) {
        configPath = path.resolve(process.cwd(), candidate);
        break;
      }
    }
  }

  if (configPath && fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
      return { ...defaultConfig, ...yaml.load(content) } as ScannerConfig;
    } else if (configPath.endsWith('.json')) {
      return { ...defaultConfig, ...JSON.parse(content) } as ScannerConfig;
    }
  }

  return defaultConfig;
}
