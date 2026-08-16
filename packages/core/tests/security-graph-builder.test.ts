import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityGraphBuilder } from '../src/engine/security-graph-builder';
import { CodeParser } from '../src/engine/code-parser';
import { RouteDetector } from '../src/engine/route-detector';
import { CodeSecurityAnalyzer } from '../src/engine/code-security-analyzer';
import { SpecParser } from '../src/engine/spec-parser';
import { ApiDiscovery } from '../src/engine/api-discovery';
import { TaintEngine } from '../src/engine/taint-engine';

describe('SecurityGraphBuilder', () => {
  let builder: SecurityGraphBuilder;

  beforeEach(() => {
    const codeParser = new CodeParser();
    builder = new SecurityGraphBuilder(
      new SpecParser(),
      new ApiDiscovery(),
      codeParser,
      new RouteDetector(codeParser),
      new CodeSecurityAnalyzer(),
      new TaintEngine(codeParser)
    );
    builder.reset();
  });

  it('should build graph from code with BOLA and SSRF', () => {
    const filePath = path.join(__dirname, 'fixtures/graph-vulnerable.ts');
    const code = fs.readFileSync(filePath, 'utf-8');
    const graph = builder.buildFromCode(code, filePath);

    const endpoints = graph.nodes.filter(n => n.type === 'endpoint');
    expect(endpoints.length).toBeGreaterThanOrEqual(3);

    const bolaEndpoint = graph.nodes.find(n => n.id === 'endpoint:GET:/users/:id');
    expect(bolaEndpoint).toBeDefined();

    const dbEdges = graph.edges.filter(e => e.from === bolaEndpoint!.id && e.type === 'ACCESSES_DB');
    expect(dbEdges.length).toBeGreaterThan(0);

    const authzEdges = graph.edges.filter(e => e.from === bolaEndpoint!.id && e.type === 'HAS_AUTHZ');
    expect(authzEdges.length).toBe(0);

    const ssrfEndpoint = graph.nodes.find(n => n.id === 'endpoint:GET:/fetch');
    expect(ssrfEndpoint).toBeDefined();
    const extEdges = graph.edges.filter(e => e.from === ssrfEndpoint!.id && e.type === 'CALLS_EXTERNAL');
    expect(extEdges.length).toBeGreaterThan(0);

    const secureEndpoint = graph.nodes.find(n => n.id === 'endpoint:GET:/secure/users/:id');
    expect(secureEndpoint).toBeDefined();
    const authzEdge = graph.edges.find(e => e.from === secureEndpoint!.id && e.type === 'HAS_AUTHZ');
    expect(authzEdge).toBeDefined();
  });

  it('should build graph from OpenAPI spec', async () => {
    const specPath = path.join(__dirname, 'fixtures/openapi3.yaml');
    const graph = await builder.buildFromSpec(specPath);

    const endpointNodes = graph.nodes.filter(n => n.type === 'endpoint');
    expect(endpointNodes.length).toBe(2);

    const userGet = graph.nodes.find(n => n.id === 'endpoint:GET:/users');
    expect(userGet).toBeDefined();
    const authEdge = graph.edges.find(e => e.from === userGet!.id && e.type === 'HAS_AUTH');
    expect(authEdge).toBeDefined();

    const inputEdges = graph.edges.filter(e => e.from === userGet!.id && e.type === 'RECEIVES_INPUT');
    expect(inputEdges.length).toBeGreaterThan(0);
  });
});
