/**
 * Severity of a vulnerability or finding.
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Category of vulnerability (aligned with OWASP API Top 10).
 */
export type VulnerabilityCategory =
  | 'authorization'
  | 'authentication'
  | 'resource-management'
  | 'injection'
  | 'data-exposure'
  | 'misconfiguration'
  | 'inventory'
  | 'business-logic'
  | 'unsafe-consumption';

/**
 * A single fix suggestion for a vulnerability.
 */
export interface Fix {
  /** Human-readable title */
  title: string;
  /** Detailed description of what the fix does */
  description: string;
  /** Code snippet or patch */
  code: string;
  /** Language of the code snippet */
  language: string;
  /** Risk level of applying this fix */
  risk: 'safe' | 'suggested' | 'ai-assisted' | 'manual';
  /** Whether the fix can be automatically applied */
  autoApplicable: boolean;
}

/**
 * Evidence supporting a finding.
 */
export interface Evidence {
  /** Type of evidence: e.g., 'user_controlled_id', 'missing_ownership_check' */
  type: string;
  /** Location in source file (line/column) */
  location?: SourceLocation;
  /** Additional details */
  description: string;
  /** Confidence contribution (0-1) */
  weight?: number;
}

/**
 * A vulnerability finding from the scanner.
 */
export interface Finding {
  /** Unique ID (usually ruleId + path + method) */
  id: string;
  /** Rule ID that generated this finding */
  ruleId: string;
  /** Rule name (human readable) */
  ruleName: string;
  /** OWASP API Top 10 classification, e.g., "API1:2023" */
  owasp: string;
  /** Category */
  category: VulnerabilityCategory;
  /** Severity */
  severity: Severity;
  /** Short message */
  message: string;
  /** Detailed description */
  description: string;
  /** File path */
  file: string;
  /** Start position */
  line: number;
  column: number;
  /** End position (optional) */
  endLine?: number;
  endColumn?: number;
  /** Code snippet where issue occurs */
  code?: string;
  /** Suggested fixes */
  fixes: Fix[];
  /** Evidence list */
  evidence: Evidence[];
  /** References (OWASP, CWE, etc.) */
  references: string[];
  /** Confidence score 0-1 (1 = certain) */
  confidence: number;
}

/**
 * A rule definition (declarative, stored in YAML/JSON).
 */
export interface Rule {
  id: string;
  name: string;
  description: string;
  category: VulnerabilityCategory;
  severity: Severity;
  owasp: string;
  /** Conditions evaluated against Security Graph + taint results */
  conditions: RuleCondition;
  /** Evidence to collect when rule matches */
  evidence: EvidenceTemplate[];
  /** Fix templates */
  fixes: FixTemplate[];
  /** References */
  references: string[];
  /** Whether rule is enabled by default */
  enabled: boolean;
}

/** Template for evidence in rule definition */
export interface EvidenceTemplate {
  type: string;
  description: string;
}

/** Template for fixes in rule definition */
export interface FixTemplate {
  title: string;
  description: string;
  code: string;
  language: string;
  risk: Fix['risk'];
  autoApplicable: boolean;
}

/**
 * Condition tree for rule evaluation.
 */
export type RuleCondition =
  | { all: RuleCondition[] }
  | { any: RuleCondition[] }
  | { not: RuleCondition }
  | { fact: string }   // e.g., 'endpoint.hasUserInput', 'endpoint.accessesDatabase'
  | { fact: string; value: unknown };

/**
 * A node in the Security Graph.
 */
export interface SecurityNode {
  id: string;
  type: SecurityNodeType;
  /** Human readable label */
  label?: string;
  /** Source location if from code */
  location?: SourceLocation;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type SecurityNodeType =
  | 'endpoint'
  | 'authentication'
  | 'authorization'
  | 'user_input'
  | 'database_access'
  | 'external_http'
  | 'sensitive_data'
  | 'response'
  | 'taint_flow';

export interface TaintSource {
  kind: 'parameter' | 'query' | 'body' | 'header' | 'cookie' | 'other';
  name: string;           // e.g., 'id', 'url', 'body'
  location: SourceLocation;
  variableName?: string;  // local variable name assigned from source
}

export interface TaintSink {
  kind: 'database' | 'external_http' | 'response' | 'command' | 'code' | 'other';
  name: string;           // e.g., 'findById', 'fetch', 'res.json'
  location: SourceLocation;
}

export interface TaintFlow {
  id: string;             // unique flow id
  source: TaintSource;
  sink: TaintSink;
  sanitized: boolean;
  sanitizer?: {
    name: string;
    location: SourceLocation;
  };
  variablePath: string[]; // list of variable names from source to sink
  endpointId?: string;    // associated endpoint node ID in Security Graph
}

/**
 * An edge in the Security Graph.
 */
export interface SecurityEdge {
  from: string;
  to: string;
  type: SecurityEdgeType;
  metadata?: Record<string, unknown>;
}

export type SecurityEdgeType =
  | 'HAS_AUTH'
  | 'HAS_AUTHZ'
  | 'RECEIVES_INPUT'
  | 'ACCESSES_DB'
  | 'CALLS_EXTERNAL'
  | 'RETURNS_SENSITIVE'
  | 'TAINT_FLOW';

/**
 * The Security Graph representing the API surface.
 */
export interface SecurityGraph {
  nodes: SecurityNode[];
  edges: SecurityEdge[];
}

/**
 * An endpoint discovered from spec or code.
 */
export interface Endpoint {
  method: string;
  path: string;
  file?: string;
  line?: number;
  auth: boolean;
  authorization: boolean;
  parameters: Parameter[];
  responses: Record<string, unknown>; // simplified
  deprecated?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * API parameter definition.
 */
export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie' | 'body';
  required: boolean;
  type?: string;
  userControlled: boolean;
}

/**
 * Source location in a file.
 */
export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

/**
 * Scanner configuration.
 */
export interface ScannerConfig {
  rules: {
    owaspApiTop10: {
      enabled: boolean;
      severity?: Severity;
    };
    custom?: { path: string; enabled?: boolean }[];
  };
  scan: {
    include: string[];
    exclude: string[];
  };
  report: {
    format: 'text' | 'json' | 'sarif' | 'html';
    output?: string;
    baseline?: string;
  };
  fix: {
    autoFix: boolean;
    aiAssisted: boolean;
  };
}

/**
 * Result of a scan.
 */
export interface ScanResult {
  timestamp: string;
  durationMs: number;
  filesScanned: number;
  findings: Finding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  rulesChecked: number;
}

/**
 * Result of remediation/fix verification.
 */
export interface VerificationResult {
  status: 'VERIFIED' | 'FAILED' | 'NEEDS_REVIEW';
  newFindings: Finding[];
  originalFindingStillPresent: boolean;
  message: string;
}

export interface RemediationResult {
  findingId: string;
  fixIndex: number;
  applied: boolean;
  patch: string;
  verification: VerificationResult;
}

export interface DetectedRoute {
  method: string;
  path: string;
  handler?: unknown; // ASTNode or function ref
  filePath: string;
  location: SourceLocation;
  framework: 'express' | 'nestjs' | 'fastapi';
  metadata?: Record<string, unknown>;
}

// Also export default types for convenience
export type {
  RuleCondition as RuleConditionType,
  SecurityNodeType as SecurityNodeTypeEnum,
  SecurityEdgeType as SecurityEdgeTypeEnum,
};
