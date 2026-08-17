import { SecurityNode, SecurityEdgeType, SecurityGraph } from '../types';
import { ASTNode } from './code-parser';

export class CodeSecurityAnalyzer {
  /**
   * Analyze a handler AST node and add security nodes/edges to the graph.
   */
  analyzeEndpoint(endpointNode: SecurityNode, handler: ASTNode, graph: SecurityGraph, endpointId: string) {
    // 1. Detect database access
    this.detectDatabaseAccess(endpointId, handler, graph);

    // 2. Detect external HTTP calls
    this.detectExternalHTTP(endpointId, handler, graph);

    // 3. Detect authorization checks
    this.detectAuthorization(endpointId, handler, graph);

    // 4. Detect sensitive data in response
    this.detectSensitiveData(endpointId, handler, graph);

    // 5. Detect authentication
    this.detectAuthentication(endpointId, handler, graph);
  }

  private detectDatabaseAccess(endpointId: string, handler: ASTNode, graph: SecurityGraph) {
    const dbMethods = [
      'find', 'findById', 'findOne', 'findAll', 'query', 'execute', 'raw',
      'select', 'insert', 'update', 'delete', 'remove', 'save'
    ];
    const dbObjectPatterns = ['db', 'database', 'connection', 'pool', 'sequelize', 'mongoose', 'repository', 'entityManager', 'User'];
    
    const callExprs = this.findCallExpressions(handler);
    for (const call of callExprs) {
      const callee = call.children[0];
      if (!callee) continue;
      let methodName: string | undefined;
      let objectName: string | undefined;
      if (callee.type === 'member_expression') {
        const objNode = callee.children[0];
        const propNode = callee.children.find(c => c.type === 'property_identifier');
        objectName = objNode?.text ?? '';
        methodName = propNode?.text;
      } else if (callee.type === 'identifier') {
        objectName = '';
        methodName = callee.text;
      }
      
      if (dbMethods.includes(methodName || '') || dbObjectPatterns.some(p => objectName?.includes(p))) {
        const nodeId = `${endpointId}:db:${methodName || 'query'}`;
        const dbNode: SecurityNode = {
          id: nodeId,
          type: 'database_access',
          label: `DB call: ${objectName}.${methodName}`,
          metadata: { method: methodName, object: objectName, code: call.text }
        };
        this.addNode(graph, dbNode);
        this.addEdge(graph, endpointId, nodeId, 'ACCESSES_DB');
      }
    }
  }

  private detectExternalHTTP(endpointId: string, handler: ASTNode, graph: SecurityGraph) {
    const httpMethods = ['fetch', 'get', 'post', 'put', 'delete', 'request'];
    const httpObjects = ['http', 'https', 'axios', 'fetch'];
    
    const callExprs = this.findCallExpressions(handler);
    for (const call of callExprs) {
      const callee = call.children[0];
      if (!callee) continue;
      let methodName: string | undefined;
      let objectName: string | undefined;
      if (callee.type === 'member_expression') {
        const objNode = callee.children[0];
        const propNode = callee.children.find(c => c.type === 'property_identifier');
        objectName = objNode?.text ?? '';
        methodName = propNode?.text;
      } else if (callee.type === 'identifier') {
        objectName = '';
        methodName = callee.text;
      }
      
      if (httpMethods.includes(methodName || '') || httpObjects.some(p => objectName?.includes(p))) {
        const nodeId = `${endpointId}:external:${methodName || 'http'}`;
        const extNode: SecurityNode = {
          id: nodeId,
          type: 'external_http',
          label: `External HTTP: ${objectName}.${methodName}`,
          metadata: { method: methodName, object: objectName, code: call.text }
        };
        this.addNode(graph, extNode);
        this.addEdge(graph, endpointId, nodeId, 'CALLS_EXTERNAL');
      }
    }
  }

  private detectAuthorization(endpointId: string, handler: ASTNode, graph: SecurityGraph) {
    const code = handler.text || '';
    const ownershipPatterns = [
      /req\.user\.id\s*===?\s*\w+/,
      /user\.id\s*===?\s*\w+\.userId/,
      /userId:\s*req\.user\.id/,
      /\.userId\s*===?\s*req\.user\.id/,
      /checkOwnership/,
      /authorize/,
      /requireOwnership/
    ];
    const rolePatterns = [
      /req\.user\.role\s*===?\s*['"]admin['"]/,
      /hasRole\(/,
      /@Roles\(/
    ];

    if (ownershipPatterns.some(p => p.test(code)) || rolePatterns.some(p => p.test(code))) {
      const authzNodeId = `${endpointId}:authorization`;
      const matchedPattern = ownershipPatterns.find(p => p.test(code)) ?? rolePatterns.find(p => p.test(code)) ?? /.*/;
      const matchedText = code.match(matchedPattern)?.[0] ?? '';
      const authzNode: SecurityNode = {
        id: authzNodeId,
        type: 'authorization',
        label: 'Authorization check present',
        metadata: { pattern: matchedText }
      };
      this.addNode(graph, authzNode);
      this.addEdge(graph, endpointId, authzNodeId, 'HAS_AUTHZ');
    }
  }

  private detectSensitiveData(endpointId: string, handler: ASTNode, graph: SecurityGraph) {
    const sensitiveFields = [
      'password', 'passwd', 'secret', 'apiKey', 'api_key', 'ssn', 'creditCard', 'cardNumber', 'cvv', 'pin'
    ];
    const responseCalls = this.findCallExpressions(handler).filter(call => {
      const callee = call.children[0];
      if (callee?.type === 'member_expression') {
        const propNode = this.findChildByType(callee, 'property_identifier');
        return ['json', 'send'].includes(propNode?.text || '');
      }
      return false;
    });

    for (const call of responseCalls) {
      const argNode = call.children.find(n => n.type === 'arguments')?.children[0];
      if (argNode) {
        const argText = argNode.text || '';
        const foundField = sensitiveFields.find(f => argText.includes(f));
        if (foundField) {
          const sensitiveNodeId = `${endpointId}:sensitive:${foundField}`;
          const sensitiveNode: SecurityNode = {
            id: sensitiveNodeId,
            type: 'sensitive_data',
            label: `Sensitive field exposed: ${foundField}`,
            metadata: { field: foundField }
          };
          this.addNode(graph, sensitiveNode);
          this.addEdge(graph, endpointId, sensitiveNodeId, 'RETURNS_SENSITIVE');
        }
      }
    }
  }

  private detectAuthentication(endpointId: string, handler: ASTNode, graph: SecurityGraph) {
    const code = handler.text || '';
    const authPatterns = [
      /authenticateToken/,
      /requireAuth/,
      /passport\.authenticate/,
      /checkAuth/,
      /verifyToken/,
      /@UseGuards\([^)]*JwtAuthGuard/
    ];
    if (authPatterns.some(p => p.test(code))) {
      const authNodeId = `${endpointId}:auth`;
      const matchedPattern = authPatterns.find(p => p.test(code)) ?? /.*/;
      const matchedText = code.match(matchedPattern)?.[0] ?? '';
      const authNode: SecurityNode = {
        id: authNodeId,
        type: 'authentication',
        label: 'Authentication middleware present',
        metadata: { pattern: matchedText }
      };
      this.addNode(graph, authNode);
      this.addEdge(graph, endpointId, authNodeId, 'HAS_AUTH');
    }
  }

  private findCallExpressions(node: ASTNode): ASTNode[] {
    const calls: ASTNode[] = [];
    const walk = (n: ASTNode) => {
      if (n.type === 'call_expression') calls.push(n);
      for (const child of n.children) walk(child);
    };
    walk(node);
    return calls;
  }

  private findChildByType(node: ASTNode, type: string): ASTNode | undefined {
    return node.children.find(c => c.type === type);
  }

  private addNode(graph: SecurityGraph, node: SecurityNode) {
    if (!graph.nodes.find(n => n.id === node.id)) {
      graph.nodes.push(node);
    }
  }

  private addEdge(graph: SecurityGraph, from: string, to: string, type: SecurityEdgeType) {
    if (!graph.edges.find(e => e.from === from && e.to === to && e.type === type)) {
      graph.edges.push({ from, to, type });
    }
  }
}
