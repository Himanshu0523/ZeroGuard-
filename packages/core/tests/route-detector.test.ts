import { describe, it, expect } from 'vitest';
import { CodeParser } from '../src/engine/code-parser';
import { RouteDetector } from '../src/engine/route-detector';
import * as fs from 'fs';
import * as path from 'path';

describe('RouteDetector', () => {
  const parser = new CodeParser();
  const detector = new RouteDetector(parser);

  it('should detect Express routes', () => {
    const filePath = path.join(__dirname, 'fixtures/express-sample.ts');
    const code = fs.readFileSync(filePath, 'utf-8');
    const routes = detector.detectRoutes(code, filePath);

    expect(routes.length).toBeGreaterThanOrEqual(3);
    const userRoute = routes.find(r => r.method === 'GET' && r.path === '/users/:id');
    expect(userRoute).toBeDefined();
    expect(userRoute!.framework).toBe('express');
  });

  it('should detect NestJS routes with controller prefix', () => {
    const filePath = path.join(__dirname, 'fixtures/nest-sample.ts');
    const code = fs.readFileSync(filePath, 'utf-8');
    const routes = detector.detectRoutes(code, filePath);

    expect(routes.length).toBeGreaterThanOrEqual(2);
    const getUser = routes.find(r => r.method === 'GET' && r.path === '/users/:id');
    expect(getUser).toBeDefined();
    expect(getUser!.framework).toBe('nestjs');
  });
});
