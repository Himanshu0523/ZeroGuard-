# @zeroguard/core

The core engine module of **ZeroGuard**. Contains AST code parsing, OpenAPI spec dereferencing, Security Graph generation, intra-procedural taint flow analysis, fact extraction, declarative rule evaluation, and patch verification.

## Exported Components

- `CodeParser`: AST builder using tree-sitter TypeScript grammar.
- `SpecParser` & `ApiDiscovery`: OpenAPI (2.0, 3.0, 3.1) and Swagger spec dereferencer and endpoint extractor.
- `RouteDetector`: Express and NestJS route handler extractor.
- `CodeSecurityAnalyzer`: Detects database queries, external HTTP client calls, ownership/authorization patterns, and sensitive payload fields from handler ASTs.
- `TaintEngine`: Intra-procedural data-flow analysis engine linking user inputs (`req.params`, `req.query`, `req.body`) to sinks.
- `SecurityGraphBuilder`: Intermediate representation (IR) builder linking endpoints, inputs, auth, DB access, and taint nodes into `SecurityGraph`.
- `FactExtractor` & `RuleEvaluator`: Evaluates fact predicates against declarative YAML rule condition trees.
- `RemediationEngine`: Applies code fixes to temporary buffers and executes patch verification re-scans.
- `Scanner`: High-level orchestrator class linking spec/code analysis to rule evaluation.
