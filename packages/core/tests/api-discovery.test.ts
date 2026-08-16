import { describe, it, expect } from 'vitest';
import { SpecParser } from '../src/engine/spec-parser';
import { ApiDiscovery } from '../src/engine/api-discovery';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('ApiDiscovery', () => {
  it('should extract endpoints with correct auth metadata', async () => {
    const parser = new SpecParser();
    const spec = await parser.parse(path.join(FIXTURES_DIR, 'openapi3.yaml'));
    const discovery = new ApiDiscovery();
    const endpoints = discovery.discover(spec);

    expect(endpoints).toHaveLength(2); // GET and POST operations on /users
    const userEndpoint = endpoints.find(e => e.path === '/users' && e.method === 'GET');
    expect(userEndpoint).toBeDefined();
    expect(userEndpoint!.auth).toBe(true);
    expect(userEndpoint!.parameters.length).toBeGreaterThan(0);
    expect(userEndpoint!.metadata?.hasPagination).toBe(true);
  });
});
