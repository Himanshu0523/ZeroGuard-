import * as fs from 'fs/promises';
import * as path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as YAML from 'js-yaml';
import { ParsedSpec, PathItem, Operation } from '../types/spec';
import { Logger } from '../utils/logger';

export class SpecParser {
  private logger = new Logger('SpecParser');

  /**
   * Parse and dereference an OpenAPI/Swagger spec file.
   * Supports .yaml, .yml, .json.
   */
  async parse(filePath: string): Promise<ParsedSpec> {
    const ext = path.extname(filePath).toLowerCase();
    let rawContent: unknown;

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      if (ext === '.yaml' || ext === '.yml') {
        rawContent = YAML.load(data);
      } else {
        rawContent = JSON.parse(data);
      }
    } catch (err) {
      throw new Error(`Failed to read/parse spec file ${filePath}: ${err}`);
    }

    // Dereference all $refs and validate
    const dereferenced = await SwaggerParser.dereference(rawContent as any);
    const version = this.detectVersion(dereferenced);

    // Normalize to ParsedSpec
    const spec: ParsedSpec = {
      version,
      info: (dereferenced as any).info || {},
      servers: (dereferenced as any).servers || [],
      paths: (dereferenced as any).paths || {},
      components: (dereferenced as any).components,
      security: (dereferenced as any).security,
      raw: dereferenced
    };

    this.logger.debug(`Parsed spec: ${spec.info.title} (${spec.version})`);
    return spec;
  }

  /**
   * Detect OpenAPI version (2.0, 3.0, 3.1) or Swagger 2.0.
   */
  private detectVersion(spec: any): string {
    if (spec.openapi) return spec.openapi;
    if (spec.swagger === '2.0') return '2.0';
    throw new Error('Unknown OpenAPI/Swagger version');
  }

  /**
   * Extract all operations from a parsed spec.
   * Returns array of { method, path, operation, pathItem }
   */
  extractOperations(spec: ParsedSpec): Array<{
    method: string;
    path: string;
    operation: Operation;
    pathItem: PathItem;
  }> {
    const operations: Array<{
      method: string;
      path: string;
      operation: Operation;
      pathItem: PathItem;
    }> = [];

    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem) continue;
      const commonParams = pathItem.parameters || [];
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['parameters', 'summary', 'description', 'servers'].includes(method)) continue;
        if (typeof operation !== 'object') continue;

        operations.push({
          method: method.toUpperCase(),
          path,
          operation: operation as Operation,
          pathItem: pathItem as PathItem
        });
      }
    }
    return operations;
  }
}
