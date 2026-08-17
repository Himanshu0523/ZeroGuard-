import { ASTNode, CodeParser } from './code-parser';
import { TaintFlow, TaintSource, TaintSink } from '../types';

export class TaintEngine {

  constructor(private parser: CodeParser) {}

  /**
   * Analyze a handler AST node for taint flows.
   * @param handler - AST node of the handler function (arrow, function, etc.)
   * @param endpointId - associated endpoint ID in Security Graph
   * @returns list of taint flows
   */
  analyze(handler: ASTNode, endpointId: string): TaintFlow[] {
    const flows: TaintFlow[] = [];
    const assignments = new Map<string, ASTNode>();
    const taintedVars = new Set<string>();

    // First pass: find all source assignments and direct taint sources
    this.collectSources(handler, assignments, taintedVars);

    // Second pass: find sinks and trace taint
    this.collectSinks(handler, assignments, taintedVars, flows, endpointId);

    return flows;
  }

  private collectSources(node: ASTNode, assignments: Map<string, ASTNode>, taintedVars: Set<string>) {
    const walk = (n: ASTNode) => {
      if (n.type === 'variable_declarator') {
        const nameNode = this.parser.findChildByType(n, 'identifier');
        const valueNode = n.children.find(c => c.type !== 'identifier' && c.type !== ':');
        if (nameNode && valueNode) {
          assignments.set(nameNode.text, valueNode);
          if (this.isSource(valueNode)) {
            taintedVars.add(nameNode.text);
          }
        }
      } else if (n.type === 'assignment_expression') {
        const left = n.children[0];
        const right = n.children[n.children.length - 1];
        const leftName = left?.text;
        if (leftName && right) {
          assignments.set(leftName, right);
          if (this.isSource(right)) {
            taintedVars.add(leftName);
          }
        }
      }
      for (const child of n.children) walk(child);
    };
    walk(node);
  }

  private collectSinks(
    node: ASTNode,
    assignments: Map<string, ASTNode>,
    taintedVars: Set<string>,
    flows: TaintFlow[],
    endpointId: string
  ) {
    const walk = (n: ASTNode) => {
      if (n.type === 'call_expression') {
        if (this.isSink(n)) {
          const args = n.children.find(c => c.type === 'arguments');
          if (args) {
            for (const arg of args.children.filter(c => c.type !== ',')) {
              const taintVar = this.findTaintedVariable(arg, taintedVars, assignments);
              if (taintVar) {
                const sanitized = this.wasSanitized(taintVar, arg, assignments, n);
                flows.push({
                  id: `${endpointId}:flow:${flows.length}`,
                  source: {
                    kind: this.getSourceKind(assignments.get(taintVar) || arg),
                    name: taintVar,
                    location: this.parser.getLocation(arg, 'unknown'),
                    variableName: taintVar
                  },
                  sink: {
                    kind: this.getSinkKind(n),
                    name: n.text,
                    location: this.parser.getLocation(n, 'unknown')
                  },
                  sanitized,
                  variablePath: [taintVar],
                  endpointId
                });
              }
            }
          }
        }
      }
      for (const child of n.children) walk(child);
    };
    walk(node);
  }

  private isSource(node: ASTNode): boolean {
    const text = node.text || '';
    return /req\.(params|query|body|headers|cookies)\.?[\w]*/.test(text) ||
           /req\.(params|query|body|headers|cookies)\[['"][\w]+['"]\]/.test(text);
  }

  private isSink(node: ASTNode): boolean {
    const text = node.text || '';
    if (/(db\.|database\.|connection\.|pool\.|sequelize\.|mongoose\.|User\.)/.test(text) &&
        /(find|findById|findOne|findAll|query|execute|raw|save|update|delete|insert)/.test(text)) return true;
    if (/(fetch|axios|http\.request|https\.request|\.get\(|\.post\()/.test(text)) return true;
    if (/res\.(json|send|end)/.test(text)) return true;
    if (/(eval|exec|spawn|child_process)/.test(text)) return true;
    return false;
  }

  private getSourceKind(node: ASTNode): TaintSource['kind'] {
    const text = node.text || '';
    if (text.includes('req.params')) return 'parameter';
    if (text.includes('req.query')) return 'query';
    if (text.includes('req.body')) return 'body';
    if (text.includes('req.headers')) return 'header';
    if (text.includes('req.cookies')) return 'cookie';
    return 'other';
  }

  private getSinkKind(node: ASTNode): TaintSink['kind'] {
    const text = node.text || '';
    if (/(db\.|database\.|connection\.|pool\.|sequelize\.|mongoose\.|User\.)/.test(text)) return 'database';
    if (/(fetch|axios|http\.request|https\.request)/.test(text)) return 'external_http';
    if (/res\.(json|send|end)/.test(text)) return 'response';
    if (/(eval|exec|spawn)/.test(text)) return 'command';
    return 'other';
  }

  private findTaintedVariable(node: ASTNode, taintedVars: Set<string>, _assignments: Map<string, ASTNode>): string | undefined {
    if (node.type === 'identifier' && taintedVars.has(node.text)) {
      return node.text;
    }
    if (node.type === 'member_expression') {
      const baseNode = node.children[0];
      if (baseNode && baseNode.type === 'identifier' && taintedVars.has(baseNode.text)) {
        return baseNode.text;
      }
    }
    if (this.isSource(node)) {
      const text = node.text;
      const match = text.match(/req\.(params|query|body|headers|cookies)\.?(\w+)?/);
      if (match) {
        return match[2] || match[1];
      }
    }
    return undefined;
  }

  private wasSanitized(
    _taintVar: string,
    _node: ASTNode,
    _assignments: Map<string, ASTNode>,
    _sinkNode: ASTNode
  ): boolean {
    return false;
  }
}
