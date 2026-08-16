import Parser, { SyntaxNode } from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import { Logger } from '../utils/logger';
import { SourceLocation } from '../types';

/**
 * A simplified AST node representation for use across the scanner.
 */
export interface ASTNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ASTNode[];
  parent?: ASTNode;
}

export class CodeParser {
  private parser: Parser;
  private logger = new Logger('CodeParser');

  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript.typescript);
  }

  /**
   * Parse source code into a simplified AST.
   */
  parse(code: string, filePath: string): ASTNode {
    const tree = this.parser.parse(code);
    return this.convertNode(tree.rootNode, code);
  }

  /**
   * Re-parse after incremental edit.
   */
  parseWithTree(code: string, oldTree: Parser.Tree, filePath: string) {
    const newTree = this.parser.parse(code, oldTree);
    return this.convertNode(newTree.rootNode, code);
  }

  /**
   * Convert tree-sitter SyntaxNode to our ASTNode.
   */
  private convertNode(node: SyntaxNode, code: string): ASTNode {
    const children: ASTNode[] = [];
    for (const child of node.namedChildren) {
      children.push(this.convertNode(child, code));
    }
    return {
      type: node.type,
      text: code.substring(node.startIndex, node.endIndex),
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      startPosition: {
        row: node.startPosition.row + 1, // 1-based line
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row + 1,
        column: node.endPosition.column
      },
      children
    };
  }

  /**
   * Find all nodes matching a type (depth-first).
   */
  findByType(node: ASTNode, type: string): ASTNode[] {
    const results: ASTNode[] = [];
    const walk = (n: ASTNode) => {
      if (n.type === type) results.push(n);
      for (const child of n.children) walk(child);
    };
    walk(node);
    return results;
  }

  /**
   * Extract string literals from a node (recursively).
   */
  extractStrings(node: ASTNode): string[] {
    const strings: string[] = [];
    const walk = (n: ASTNode) => {
      if (n.type === 'string' || n.type === 'string_literal' || n.type === 'template_string') {
        strings.push(n.text.slice(1, -1));
      }
      for (const child of n.children) walk(child);
    };
    walk(node);
    return strings;
  }

  /**
   * Find a child node by type directly under a node (non-recursive).
   */
  findChildByType(node: ASTNode, type: string): ASTNode | undefined {
    return node.children.find(c => c.type === type);
  }

  /**
   * Find children by type directly under a node.
   */
  findChildrenByType(node: ASTNode, type: string): ASTNode[] {
    return node.children.filter(c => c.type === type);
  }

  /**
   * Get the source location of a node.
   */
  getLocation(node: ASTNode, filePath: string): SourceLocation {
    return {
      file: filePath,
      line: node.startPosition.row,
      column: node.startPosition.column,
      endLine: node.endPosition.row,
      endColumn: node.endPosition.column
    };
  }
}
