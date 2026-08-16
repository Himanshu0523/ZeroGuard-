import { SecurityGraph, SecurityNode, SecurityEdgeType, SecurityNodeType, Endpoint, DetectedRoute } from '../types';
import { SpecParser } from './spec-parser';
import { ApiDiscovery } from './api-discovery';
import { CodeParser, ASTNode } from './code-parser';
import { RouteDetector } from './route-detector';
import { Logger } from '../utils/logger';
import { CodeSecurityAnalyzer } from './code-security-analyzer';
import { TaintEngine } from './taint-engine';

export class SecurityGraphBuilder {
  private logger = new Logger('SecurityGraphBuilder');
  private graph: SecurityGraph = { nodes: [], edges: [] };

  constructor(
    private specParser?: SpecParser,
    private apiDiscovery?: ApiDiscovery,
    private codeParser?: CodeParser,
    private routeDetector?: RouteDetector,
    private codeAnalyzer?: CodeSecurityAnalyzer,
    private taintEngine?: TaintEngine
  ) {}

  /**
   * Build graph from a parsed OpenAPI spec.
   */
  async buildFromSpec(specFilePath: string): Promise<SecurityGraph> {
    if (!this.specParser || !this.apiDiscovery) {
      throw new Error('SpecParser and ApiDiscovery required');
    }
    const spec = await this.specParser.parse(specFilePath);
    const endpoints = this.apiDiscovery.discover(spec);
    for (const endpoint of endpoints) {
      this.addEndpointNode(endpoint);
    }
    return this.graph;
  }

  /**
   * Build graph from a source code file.
   */
  buildFromCode(code: string, filePath: string): SecurityGraph {
    if (!this.codeParser || !this.routeDetector || !this.codeAnalyzer) {
      throw new Error('CodeParser, RouteDetector, CodeSecurityAnalyzer required');
    }
    const routes = this.routeDetector.detectRoutes(code, filePath);
    for (const route of routes) {
      this.addEndpointNodeFromRoute(route, code, filePath);
    }
    return this.graph;
  }

  /**
   * Reset graph (call before building a new one).
   */
  reset() {
    this.graph = { nodes: [], edges: [] };
  }

  /**
   * Get the current graph.
   */
  getGraph(): SecurityGraph {
    return this.graph;
  }

  private addEndpointNode(endpoint: Endpoint) {
    const id = this.endpointId(endpoint.method, endpoint.path);
    const node: SecurityNode = {
      id,
      type: 'endpoint',
      label: `${endpoint.method} ${endpoint.path}`,
      metadata: {
        auth: endpoint.auth,
        authorization: endpoint.authorization,
        hasRateLimit: endpoint.metadata?.hasRateLimit,
        hasPagination: endpoint.metadata?.hasPagination,
      }
    };
    this.addNode(node);

    if (endpoint.auth) {
      const authNode: SecurityNode = {
        id: `${id}:auth`,
        type: 'authentication',
        label: 'Authentication',
        metadata: { schemes: endpoint.metadata?.security }
      };
      this.addNode(authNode);
      this.addEdge(id, authNode.id, 'HAS_AUTH');
    }

    for (const param of endpoint.parameters) {
      if (param.userControlled) {
        const inputNode: SecurityNode = {
          id: `${id}:input:${param.name}`,
          type: 'user_input',
          label: `Input: ${param.name} (${param.in})`,
          metadata: { parameter: param }
        };
        this.addNode(inputNode);
        this.addEdge(id, inputNode.id, 'RECEIVES_INPUT');
      }
    }
  }

  private addEndpointNodeFromRoute(route: DetectedRoute, code: string, filePath: string) {
    const id = this.endpointId(route.method, route.path);
    const node: SecurityNode = {
      id,
      type: 'endpoint',
      label: `${route.method} ${route.path}`,
      location: route.location,
      metadata: {
        framework: route.framework,
        file: filePath,
      }
    };
    this.addNode(node);

    if (route.handler && this.codeAnalyzer) {
      this.codeAnalyzer.analyzeEndpoint(node, route.handler as ASTNode, this.graph, id);
    } else {
      this.logger.debug(`No handler found for ${route.method} ${route.path}`);
    }

    if (route.handler && this.taintEngine) {
      const taintFlows = this.taintEngine.analyze(route.handler as ASTNode, id);
      for (const flow of taintFlows) {
        const sinkNodeId = `${id}:taint:${flow.sink.kind}:${flow.sink.name}`;
        const sinkNode: SecurityNode = {
          id: sinkNodeId,
          type: 'taint_flow',
          label: `Taint: ${flow.source.name} -> ${flow.sink.name}`,
          metadata: flow as unknown as Record<string, unknown>
        };
        this.addNode(sinkNode);
        this.addEdge(id, sinkNodeId, 'TAINT_FLOW');
      }
    }

    this.addPathParameterInputs(id, route.path);
  }

  private addPathParameterInputs(endpointId: string, path: string) {
    const paramMatches = path.matchAll(/[:{]([^}/]+)[}]?/g);
    for (const match of paramMatches) {
      const paramName = match[1];
      const inputNode: SecurityNode = {
        id: `${endpointId}:input:${paramName}`,
        type: 'user_input',
        label: `Path param: ${paramName}`,
        metadata: { parameter: { name: paramName, in: 'path', userControlled: true } }
      };
      this.addNode(inputNode);
      this.addEdge(endpointId, inputNode.id, 'RECEIVES_INPUT');
    }
  }

  private endpointId(method: string, path: string): string {
    return `endpoint:${method.toUpperCase()}:${path}`;
  }

  private addNode(node: SecurityNode) {
    if (!this.graph.nodes.find(n => n.id === node.id)) {
      this.graph.nodes.push(node);
    }
  }

  private addEdge(from: string, to: string, type: SecurityEdgeType) {
    if (!this.graph.edges.find(e => e.from === from && e.to === to && e.type === type)) {
      this.graph.edges.push({ from, to, type });
    }
  }

  getEndpointNodes(): SecurityNode[] {
    return this.graph.nodes.filter(n => n.type === 'endpoint');
  }

  getNodeById(id: string): SecurityNode | undefined {
    return this.graph.nodes.find(n => n.id === id);
  }

  findEdges(from: string, type?: SecurityEdgeType): SecurityEdge[] {
    return this.graph.edges.filter(e => e.from === from && (!type || e.type === type));
  }

  getNodesByType(type: SecurityNodeType): SecurityNode[] {
    return this.graph.nodes.filter(n => n.type === type);
  }
}
