import { describe, it, expect } from 'vitest';
import { SpecParser } from '../src/engine/spec-parser';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('SpecParser', () => {
  it('should parse an OpenAPI 3.0 YAML file', async () => {
    const parser = new SpecParser();
    const spec = await parser.parse(path.join(FIXTURES_DIR, 'openapi3.yaml'));
    expect(spec.version).toBe('3.0.0');
    expect(spec.info.title).toBeDefined();
    expect(Object.keys(spec.paths)).toHaveLength(1);
  });

  it('should parse a Swagger 2.0 JSON file', async () => {
    const parser = new SpecParser();
    const spec = await parser.parse(path.join(FIXTURES_DIR, 'swagger2.json'));
    expect(spec.version).toBe('2.0');
    expect(spec.paths['/users']).toBeDefined();
  });
});
