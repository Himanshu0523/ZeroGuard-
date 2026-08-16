import { Rule, RuleCondition, Finding, SecurityGraph, SecurityNode } from '../types';
import { FactExtractor, FactMap } from './facts';
import { Logger } from '../utils/logger';

export class RuleEvaluator {
  private logger = new Logger('RuleEvaluator');
  private factExtractor = new FactExtractor();

  constructor(public rules: Rule[]) {}

  /**
   * Evaluate all rules against a SecurityGraph and return findings.
   */
  evaluate(graph: SecurityGraph): Finding[] {
    const findings: Finding[] = [];
    const endpointNodes = graph.nodes.filter(n => n.type === 'endpoint');

    for (const endpoint of endpointNodes) {
      const facts = this.factExtractor.extract(endpoint, graph);
      for (const rule of this.rules) {
        if (!rule.enabled) continue;
        if (this.evaluateCondition(rule.conditions, facts)) {
          const finding = this.buildFinding(rule, endpoint, facts, graph);
          findings.push(finding);
        }
      }
    }
    return findings;
  }

  private evaluateCondition(condition: RuleCondition, facts: FactMap): boolean {
    if ('all' in condition) {
      return condition.all.every(c => this.evaluateCondition(c, facts));
    }
    if ('any' in condition) {
      return condition.any.some(c => this.evaluateCondition(c, facts));
    }
    if ('not' in condition) {
      return !this.evaluateCondition(condition.not, facts);
    }
    if ('fact' in condition) {
      const value = facts[condition.fact];
      if (condition.value !== undefined) {
        return value === condition.value;
      }
      return Boolean(value);
    }
    return false;
  }

  private buildFinding(
    rule: Rule,
    endpoint: SecurityNode,
    facts: FactMap,
    graph: SecurityGraph
  ): Finding {
    const evidence = rule.evidence.map(ev => ({
      type: ev.type,
      description: ev.description,
      weight: 1
    }));

    const location = endpoint.location;

    return {
      id: `${rule.id}-${endpoint.id.replace(/[^a-zA-Z0-9]/g, '_')}`,
      ruleId: rule.id,
      ruleName: rule.name,
      owasp: rule.owasp,
      category: rule.category,
      severity: rule.severity,
      message: rule.description,
      description: rule.description,
      file: location?.file || '',
      line: location?.line || 0,
      column: location?.column || 0,
      endLine: location?.endLine,
      endColumn: location?.endColumn,
      code: endpoint.label,
      fixes: rule.fixes.map(f => ({
        title: f.title,
        description: f.description,
        code: f.code,
        language: f.language,
        risk: f.risk,
        autoApplicable: f.autoApplicable
      })),
      evidence,
      references: rule.references,
      confidence: (rule as any).confidence ?? 1.0
    };
  }
}
