import { describe, it, expect } from 'vitest';
import { Analyzer } from '../src/analyzer';
import { Scanner } from '@zeroguard/core';

describe('Analyzer', () => {
  it('should return findings for a vulnerable file in memory', async () => {
    const config = {
      rules: { owaspApiTop10: { enabled: true, severity: 'low' as const } },
      scan: { include: [], exclude: [] },
      report: { format: 'text' as const },
      fix: { autoFix: false, aiAssisted: false }
    };
    const scanner = new Scanner(config);
    await scanner.initialize();
    const analyzer = new Analyzer(scanner);
    const code = `app.get('/users/:id', async (req,res) => { const user = await User.findById(req.params.id); res.json(user); });`;
    const findings = await analyzer.analyze('file:///test.ts', code);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('api1-bola');
  });

  it('should use cache for identical content', async () => {
    const config = {
      rules: { owaspApiTop10: { enabled: true, severity: 'low' as const } },
      scan: { include: [], exclude: [] },
      report: { format: 'text' as const },
      fix: { autoFix: false, aiAssisted: false }
    };
    const scanner = new Scanner(config);
    await scanner.initialize();
    const analyzer = new Analyzer(scanner);
    const code = `app.get('/users', (req,res) => res.json([]));`;
    const uri = 'file:///test2.ts';
    const findings1 = await analyzer.analyze(uri, code);
    const findings2 = await analyzer.analyze(uri, code);
    expect(findings1).toBe(findings2);
  });
});
