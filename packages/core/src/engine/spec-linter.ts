import { Spectral, Document } from '@stoplight/spectral-core';
import { Yaml } from '@stoplight/spectral-parsers';
import * as fs from 'fs/promises';

/**
 * Spectral linter for OpenAPI specs.
 * Runs a set of rules defined in a ruleset file.
 */
export class SpecLinter {
  private spectral: Spectral;

  constructor() {
    this.spectral = new Spectral();
  }

  async loadRuleset(rulesetPath: string) {
    const ruleset = await import(rulesetPath);
    this.spectral.setRuleset(ruleset.default);
  }

  async lint(specFilePath: string) {
    const content = await fs.readFile(specFilePath, 'utf-8');
    const doc = new Document(content, Yaml, specFilePath);
    const results = await this.spectral.run(doc);
    return results;
  }
}
