import { CodeParser, ASTNode } from './code-parser';
import { DetectedRoute } from '../types';

export class RouteDetector {
  constructor(private parser: CodeParser) {}

  /**
   * Detect routes from a TypeScript/JavaScript file.
   * Returns list of DetectedRoute.
   */
  detectRoutes(code: string, filePath: string): DetectedRoute[] {
    const ast = this.parser.parse(code, filePath);
    const routes: DetectedRoute[] = [];

    // Detect Express/Fastify routes
    routes.push(...this.detectExpressRoutes(ast, filePath));

    // Detect NestJS decorators
    routes.push(...this.detectNestRoutes(ast, filePath));

    return routes;
  }

  /**
   * Detect Express/Fastify style: app.get('/path', handler) or router.get(...).
   */
  private detectExpressRoutes(ast: ASTNode, filePath: string): DetectedRoute[] {
    const routes: DetectedRoute[] = [];

    // Find all call expressions
    const callExprs = this.parser.findByType(ast, 'call_expression');

    for (const call of callExprs) {
      const func = call.children[0];
      if (!func) continue;

      let methodName: string | undefined;

      if (func.type === 'member_expression') {
        const propNode = this.parser.findChildByType(func, 'property_identifier');
        if (!propNode) continue;
        methodName = propNode.text;
      } else {
        continue;
      }

      const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
      if (!methodName || !httpMethods.includes(methodName.toLowerCase())) continue;

      const args = call.children.filter(n => n.type === 'arguments');
      if (args.length === 0) continue;

      const argList = args[0];
      const pathArg = argList.children.find(n => n.type === 'string' || n.type === 'template_string');
      if (!pathArg) continue;

      const path = this.extractStringValue(pathArg);
      if (!path) continue;

      const handlerNode = argList.children.find(n =>
        ['arrow_function', 'function_expression', 'function_declaration', 'identifier', 'call_expression'].includes(n.type)
      );

      routes.push({
        method: methodName.toUpperCase(),
        path,
        handler: handlerNode,
        filePath,
        location: this.parser.getLocation(call, filePath),
        framework: 'express'
      });
    }

    return routes;
  }

  /**
   * Detect NestJS decorators: @Controller('prefix'), @Get('path'), etc.
   */
  private detectNestRoutes(ast: ASTNode, filePath: string): DetectedRoute[] {
    const routes: DetectedRoute[] = [];

    const classDecls = this.parser.findByType(ast, 'class_declaration');
    for (const cls of classDecls) {
      const controllerDecorator = this.findDecoratorByName(cls, 'Controller');
      if (!controllerDecorator) continue;

      const prefix = this.getDecoratorArgString(controllerDecorator) || '';

      const methodDefs = this.parser.findByType(cls, 'method_definition');
      for (const method of methodDefs) {
        const routeDecorators = method.children.filter(n => n.type === 'decorator');
        for (const dec of routeDecorators) {
          const name = this.getDecoratorName(dec);
          const httpMethod = this.nestDecoratorToHttpMethod(name);
          if (!httpMethod) continue;

          const subPath = this.getDecoratorArgString(dec) || '';
          const fullPath = this.joinPaths(prefix, subPath);
          routes.push({
            method: httpMethod,
            path: fullPath,
            handler: method,
            filePath,
            location: this.parser.getLocation(method, filePath),
            framework: 'nestjs'
          });
        }
      }
    }

    return routes;
  }

  private findDecoratorByName(node: ASTNode, name: string): ASTNode | undefined {
    for (const child of node.children) {
      if (child.type === 'decorator') {
        const callExpr = this.parser.findChildByType(child, 'call_expression');
        if (callExpr) {
          const func = callExpr.children[0];
          if (func && func.text === name) return child;
        }
      }
    }
    return undefined;
  }

  private getDecoratorName(decorator: ASTNode): string {
    const callExpr = this.parser.findChildByType(decorator, 'call_expression');
    if (callExpr) {
      const func = callExpr.children[0];
      return func?.text || '';
    }
    return '';
  }

  private getDecoratorArgString(decorator: ASTNode): string | undefined {
    const callExpr = this.parser.findChildByType(decorator, 'call_expression');
    if (callExpr) {
      const args = this.parser.findChildrenByType(callExpr, 'arguments');
      if (args.length > 0) {
        const firstArg = args[0].children.find(n => n.type === 'string');
        return firstArg ? firstArg.text.slice(1, -1) : undefined;
      }
    }
    return undefined;
  }

  private nestDecoratorToHttpMethod(name: string): string | undefined {
    const map: Record<string, string> = {
      Get: 'GET',
      Post: 'POST',
      Put: 'PUT',
      Delete: 'DELETE',
      Patch: 'PATCH',
      Options: 'OPTIONS',
      Head: 'HEAD',
      All: 'ALL'
    };
    return map[name];
  }

  private joinPaths(prefix: string, subPath: string): string {
    if (!prefix) return subPath.startsWith('/') ? subPath : '/' + subPath;
    if (!subPath) return prefix.startsWith('/') ? prefix : '/' + prefix;
    let normPrefix = prefix.startsWith('/') ? prefix : '/' + prefix;
    if (normPrefix.endsWith('/') && subPath.startsWith('/')) return normPrefix + subPath.slice(1);
    if (!normPrefix.endsWith('/') && !subPath.startsWith('/')) return normPrefix + '/' + subPath;
    return normPrefix + subPath;
  }

  private extractStringValue(node: ASTNode): string | undefined {
    if (node.type === 'string') {
      return node.text.slice(1, -1);
    }
    if (node.type === 'template_string') {
      return node.text.slice(1, -1);
    }
    return undefined;
  }
}
