import { describe, it, expect } from 'vitest';
import { RemediationEngine } from '../src/engine/remediation-engine';
import { Scanner } from '../src/scanner';
import { Finding } from '../src/types';

describe('RemediationEngine', () => {
  it('should apply a fix to temporary code and verify resolution', async () => {
    const config = {
      rules: { owaspApiTop10: { enabled: true, severity: 'low' as const } },
      scan: { include: [], exclude: [] },
      report: { format: 'text' as const },
      fix: { autoFix: false, aiAssisted: false }
    };
    const scanner = new Scanner(config);
    await scanner.initialize();
    const remediation = new RemediationEngine(scanner);

    const originalContent = `app.get('/users/:id', async (req, res) => {\n  const user = await User.findById(req.params.id);\n  res.json(user);\n});`;
    const dummyFinding: Finding = {
      id: 'api1-bola-test',
      ruleId: 'api1-bola',
      ruleName: 'Broken Object Level Authorization',
      owasp: 'API1:2023',
      category: 'authorization',
      severity: 'critical',
      message: 'BOLA vulnerability',
      description: 'Missing ownership check',
      file: 'test.ts',
      line: 1,
      column: 0,
      code: 'app.get',
      fixes: [
        {
          title: 'Add ownership check',
          description: 'Add check',
          code: `app.get('/users/:id', authenticateToken, async (req, res) => {\n  const user = await User.findOne({ _id: req.params.id, userId: req.user.id });\n  res.json(user);\n});`,
          language: 'typescript',
          risk: 'suggested',
          autoApplicable: true
        }
      ],
      evidence: [],
      references: [],
      confidence: 0.95
    };

    const result = await remediation.applyAndVerify('test.ts', originalContent, dummyFinding);
    expect(result.applied).toBe(true);
    expect(result.verification.status).toBe('VERIFIED');
  });
});
