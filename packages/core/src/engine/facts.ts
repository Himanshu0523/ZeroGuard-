import { SecurityGraph, SecurityNode } from '../types';

export interface FactMap {
  [fact: string]: boolean | string | number | Record<string, unknown>;
}

export class FactExtractor {
  extract(endpointNode: SecurityNode, graph: SecurityGraph): FactMap {
    const facts: FactMap = {};
    const endpointId = endpointNode.id;

    const hasEdge = (type: string) => graph.edges.some(e => e.from === endpointId && e.type === type);

    facts['endpoint.hasUserInput'] = hasEdge('RECEIVES_INPUT');
    facts['endpoint.accessesDatabase'] = hasEdge('ACCESSES_DB');
    facts['endpoint.callsExternalService'] = hasEdge('CALLS_EXTERNAL');
    facts['endpoint.hasAuthentication'] = hasEdge('HAS_AUTH');
    facts['endpoint.hasAuthorization'] = hasEdge('HAS_AUTHZ');
    facts['endpoint.returnsSensitiveData'] = hasEdge('RETURNS_SENSITIVE');
    facts['endpoint.isDeprecated'] = Boolean(endpointNode.metadata?.deprecated);
    facts['endpoint.hasRateLimit'] = Boolean(endpointNode.metadata?.hasRateLimit);
    facts['endpoint.hasPagination'] = Boolean(endpointNode.metadata?.hasPagination);

    const labelLower = (endpointNode.label || '').toLowerCase();
    facts['endpoint.isAdminEndpoint'] = labelLower.includes('/admin') || Boolean((endpointNode.metadata?.tags as string[])?.includes('admin'));

    facts['endpoint.hasCORSStar'] = Boolean(endpointNode.metadata?.hasCORSStar);
    facts['endpoint.hasVerboseErrors'] = Boolean(endpointNode.metadata?.hasVerboseErrors);

    const taintNodes = graph.nodes.filter(n => n.type === 'taint_flow' && graph.edges.some(e => e.from === endpointId && e.to === n.id && e.type === 'TAINT_FLOW'));
    const taintSinkKinds = taintNodes.map(n => (n.metadata as any)?.sink?.kind);
    facts['endpoint.hasTaintFlowToDatabase'] = taintSinkKinds.includes('database');
    facts['endpoint.hasTaintFlowToExternal'] = taintSinkKinds.includes('external_http');
    facts['endpoint.hasTaintFlowToResponse'] = taintSinkKinds.includes('response');
    facts['endpoint.hasTaintFlow'] = taintNodes.length > 0;

    return facts;
  }
}
