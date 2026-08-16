import { ScanResult } from '@zeroguard/core';

export class SARIFReporter {
  report(result: ScanResult): string {
    const sarif = {
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'ZeroGuard',
              informationUri: 'https://github.com/zeroguard/zeroguard',
              rules: this.buildRules(result)
            }
          },
          results: result.findings.map(f => ({
            ruleId: f.ruleId,
            message: { text: f.message },
            level: this.mapLevel(f.severity),
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: f.file },
                  region: {
                    startLine: f.line,
                    startColumn: f.column,
                    endLine: f.endLine || f.line,
                    endColumn: f.endColumn || f.column + 1
                  }
                }
              }
            ],
            properties: {
              confidence: f.confidence,
              evidence: f.evidence,
              fixes: f.fixes
            }
          }))
        }
      ]
    };
    return JSON.stringify(sarif, null, 2);
  }

  private buildRules(result: ScanResult) {
    const ruleMap = new Map<string, any>();
    for (const f of result.findings) {
      if (!ruleMap.has(f.ruleId)) {
        ruleMap.set(f.ruleId, {
          id: f.ruleId,
          shortDescription: { text: f.ruleName },
          fullDescription: { text: f.description },
          helpUri: f.references?.[0] || ''
        });
      }
    }
    return Array.from(ruleMap.values());
  }

  private mapLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'note';
      default: return 'note';
    }
  }
}
