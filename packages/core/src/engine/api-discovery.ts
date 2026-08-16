import { ParsedSpec, Operation, ParameterObject } from '../types/spec';
import { Endpoint, Parameter } from '../types';

export class ApiDiscovery {
  /**
   * Discover endpoints from a parsed spec.
   */
  discover(spec: ParsedSpec): Endpoint[] {
    const endpoints: Endpoint[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem) continue;
      const commonParameters = pathItem.parameters || [];

      for (const [method, operation] of Object.entries(pathItem)) {
        if (['parameters', 'summary', 'description', 'servers'].includes(method)) continue;
        if (typeof operation !== 'object') continue;

        const op = operation as Operation;
        const endpoint = this.buildEndpoint(method.toUpperCase(), path, op, commonParameters, spec);
        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  private buildEndpoint(
    method: string,
    path: string,
    operation: Operation,
    commonParameters: ParameterObject[],
    spec: ParsedSpec
  ): Endpoint {
    // Merge common parameters with operation-specific parameters
    const allParams = [...commonParameters, ...(operation.parameters || [])];
    const parameters: Parameter[] = allParams.map(p => this.toParameter(p));

    // Check security requirements (operation-level overrides spec-level)
    const security = operation.security || spec.security || [];
    const hasAuth = security.length > 0;

    // Detect rate limit (custom extension) or pagination params
    const hasRateLimit = Boolean((operation as any)['x-rate-limit'] ?? (spec as any)['x-rate-limit']);
    const hasPagination = allParams.some(p =>
      ['limit', 'offset', 'page', 'cursor'].includes(p.name.toLowerCase())
    );

    const deprecated = Boolean(operation.deprecated);

    return {
      method,
      path,
      file: '', // to be filled by scanner if from code
      auth: hasAuth,
      authorization: false, // will be enriched later
      parameters,
      responses: operation.responses || {},
      deprecated,
      metadata: {
        hasRateLimit,
        hasPagination,
        operationId: operation.operationId,
        tags: operation.tags || [],
        security
      }
    };
  }

  private toParameter(param: ParameterObject): Parameter {
    return {
      name: param.name,
      in: param.in,
      required: param.required ?? false,
      type: param.schema?.type,
      userControlled: true // all spec params are user-controlled by definition
    };
  }
}
