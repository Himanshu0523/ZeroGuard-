import { describe, it, expect } from 'vitest';
import { CodeParser } from '../src/engine/code-parser';
import { TaintEngine } from '../src/engine/taint-engine';

describe('TaintEngine', () => {
  const parser = new CodeParser();
  const engine = new TaintEngine(parser);

  it('should detect taint flow from req.params.id to database query (BOLA)', () => {
    const code = `
      app.get('/users/:id', async (req, res) => {
        const userId = req.params.id;
        const user = await User.findById(userId);
        res.json(user);
      });
    `;
    const ast = parser.parse(code, 'test.ts');
    const arrow = parser.findByType(ast, 'arrow_function')[0];
    const flows = engine.analyze(arrow, 'endpoint:GET:/users/:id');

    expect(flows.length).toBeGreaterThan(0);
    const dbFlow = flows.find(f => f.sink.kind === 'database');
    expect(dbFlow).toBeDefined();
    expect(dbFlow!.source.kind).toBe('parameter');
    expect(dbFlow!.sanitized).toBe(false);
  });

  it('should detect taint flow from req.query.url to fetch (SSRF)', () => {
    const code = `
      app.get('/fetch', (req, res) => {
        const url = req.query.url;
        fetch(url).then(r => res.json(r));
      });
    `;
    const ast = parser.parse(code, 'test.ts');
    const arrow = parser.findByType(ast, 'arrow_function')[0];
    const flows = engine.analyze(arrow, 'endpoint:GET:/fetch');
    const ssrf = flows.find(f => f.sink.kind === 'external_http');
    expect(ssrf).toBeDefined();
    expect(ssrf!.source.kind).toBe('query');
  });

  it('should execute without failure on secure pattern code', () => {
    const code = `
      app.get('/users/:id', async (req, res) => {
        const userId = req.params.id;
        const user = await User.findOne({ id: userId, owner: req.user.id });
        res.json(user);
      });
    `;
    const ast = parser.parse(code, 'test.ts');
    const arrow = parser.findByType(ast, 'arrow_function')[0];
    const flows = engine.analyze(arrow, 'endpoint:GET:/users/:id');
    expect(flows).toBeDefined();
  });
});
