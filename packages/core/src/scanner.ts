import * as fs from 'fs';
import * as path from 'path';
import { ScannerConfig, ScanResult, Finding } from './types';
import { SpecParser } from './engine/spec-parser';
import { ApiDiscovery } from './engine/api-discovery';
import { CodeParser } from './engine/code-parser';
import { RouteDetector } from './engine/route-detector';
import { CodeSecurityAnalyzer } from './engine/code-security-analyzer';
import { TaintEngine } from './engine/taint-engine';
import { SecurityGraphBuilder } from './engine/security-graph-builder';
import { RuleEvaluator } from './engine/rule-evaluator';
import { RuleLoader } from './rules/loader';
import { RemediationEngine } from './engine/remediation-engine';
import { Logger } from './utils/logger';

export class Scanner {
  private logger = new Logger('Scanner');
  private specParser = new SpecParser();
  private apiDiscovery = new ApiDiscovery();
  private codeParser = new CodeParser();
  private routeDetector = new RouteDetector(this.codeParser);
  private codeAnalyzer = new CodeSecurityAnalyzer();
  private taintEngine = new TaintEngine(this.codeParser);
  private graphBuilder = new SecurityGraphBuilder(
    this.specParser,
    this.apiDiscovery,
    this.codeParser,
    this.routeDetector,
    this.codeAnalyzer,
    this.taintEngine
  );
  public ruleEvaluator?: RuleEvaluator;
  public remediationEngine: RemediationEngine;
  private ruleLoader = new RuleLoader();

  constructor(private config: ScannerConfig) {
    this.remediationEngine = new RemediationEngine(this);
  }

  async initialize() {
    const rulesDir = path.resolve(__dirname, '../../rules/src/owasp-api-top10');
    if (fs.existsSync(rulesDir)) {
      const rules = await this.ruleLoader.loadFromDirectory(rulesDir);
      this.ruleEvaluator = new RuleEvaluator(rules);
    }
  }

  async scanFile(filePath: string): Promise<ScanResult> {
    const start = Date.now();
    this.graphBuilder.reset();
    const ext = path.extname(filePath).toLowerCase();
    const findings: Finding[] = [];

    if (['.yaml', '.yml', '.json'].includes(ext)) {
      try {
        const graph = await this.graphBuilder.buildFromSpec(filePath);
        findings.push(...(this.ruleEvaluator?.evaluate(graph) || []));
      } catch (err) {
        this.logger.debug(`Could not parse as spec: ${filePath}`);
      }
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      const code = fs.readFileSync(filePath, 'utf-8');
      const graph = this.graphBuilder.buildFromCode(code, filePath);
      findings.push(...(this.ruleEvaluator?.evaluate(graph) || []));
    }

    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
      filesScanned: 1,
      findings,
      summary: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length
      },
      rulesChecked: this.ruleEvaluator?.rules.length || 0
    };
  }

  async scan(targetPath: string): Promise<ScanResult> {
    return this.scanFile(targetPath);
  }
}
