import { describe, it, expect, beforeAll } from 'vitest';
import { RuleEvaluator } from '../src/engine/rule-evaluator';
import { RuleLoader } from '../src/rules/loader';
import { SecurityGraphBuilder } from '../src/engine/security-graph-builder';
import { SpecParser } from '../src/engine/spec-parser';
import { ApiDiscovery } from '../src/engine/api-discovery';
import { CodeParser } from '../src/engine/code-parser';
import { RouteDetector } from '../src/engine/route-detector';
import { CodeSecurityAnalyzer } from '../src/engine/code-security-analyzer';
import { TaintEngine } from '../src/engine/taint-engine';
import * as path from 'path';
import * as fs from 'fs';

describe('RuleEvaluator', () => {
  let rules: any[];
  let evaluator: RuleEvaluator;
  let builder: SecurityGraphBuilder;

  beforeAll(async () => {
    const loader = new RuleLoader();
    rules = await loader.loadFromDirectory(path.resolve(__dirname, '../../rules/src/owasp-api-top10'));
    evaluator = new RuleEvaluator(rules);
    const parser = new CodeParser();
    builder = new SecurityGraphBuilder(
      new SpecParser(),
      new ApiDiscovery(),
      parser,
      new RouteDetector(parser),
      new CodeSecurityAnalyzer(),
      new TaintEngine(parser)
    );
  });

  it('should detect BOLA on vulnerable code', () => {
    const filePath = path.join(__dirname, 'fixtures/graph-vulnerable.ts');
    const code = fs.readFileSync(filePath, 'utf-8');
    builder.reset();
    const graph = builder.buildFromCode(code, filePath);
    const findings = evaluator.evaluate(graph);
    const bola = findings.find(f => f.ruleId === 'api1-bola');
    expect(bola).toBeDefined();
    expect(bola!.severity).toBe('critical');
    expect(bola!.confidence).toBeGreaterThan(0.9);
  });

  it('should detect broken authentication on spec without security', async () => {
    const specPath = path.join(__dirname, 'fixtures/openapi-no-security.yaml');
    builder.reset();
    const graph = await builder.buildFromSpec(specPath);
    const findings = evaluator.evaluate(graph);
    const auth = findings.find(f => f.ruleId === 'api2-broken-authentication');
    expect(auth).toBeDefined();
  });
});
