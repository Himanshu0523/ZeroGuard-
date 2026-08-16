# ZeroGuard

[![CI](https://github.com/Himanshu0523/ZeroGuard-/actions/workflows/ci.yml/badge.svg)](https://github.com/Himanshu0523/ZeroGuard-/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![pnpm workspace](https://img.shields.io/badge/pnpm-workspace-orange.svg)](https://pnpm.io/)

**ZeroGuard** is a Zero-Trust API Security Scanner designed to detect and remediate OWASP API Security Top 10 (2023) vulnerabilities across OpenAPI specifications and Node.js source code (Express & NestJS).

By synthesizing AST parsing (via tree-sitter), security graph intermediate representations, and intra-procedural taint analysis, ZeroGuard correlates input sources directly to database query sinks, HTTP clients, and response payloads.

---

## 🚀 Key Capabilities

- **Multi-Source Discovery**:
  - Dereferences OpenAPI 2.0 / 3.0 / 3.1 & Swagger specifications (`@apidevtools/swagger-parser`).
  - AST-based route extraction for Express/Fastify (`app.get`, `router.post`) and NestJS decorators (`@Controller`, `@Get`, `@Post`).
- **Security Graph Intermediate Representation (IR)**:
  - Constructs graph models representing endpoints, input sources (`RECEIVES_INPUT`), authentication (`HAS_AUTH`), authorization checks (`HAS_AUTHZ`), DB calls (`ACCESSES_DB`), external HTTP requests (`CALLS_EXTERNAL`), and sensitive response data (`RETURNS_SENSITIVE`).
- **Intra-Procedural Taint Engine**:
  - Traces user-controlled inputs (`req.params`, `req.query`, `req.body`, `req.headers`) through variable assignments to database sinks and external calls.
- **Declarative Rule Engine**:
  - Evaluates YAML rule definitions (`all`, `any`, `not` condition trees) against Security Graph facts.
  - Implemented rules: **API1:2023 (BOLA)**, **API2:2023 (Broken Auth)**, **API3:2023 (Broken Property Authz)**, **API4:2023 (Resource Consumption)**, **API5:2023 (Function Level Authz)**, **API8:2023 (Misconfiguration)**.
- **Automated Fix Verification**:
  - `zta fix` command applies suggested code patches to temporary buffers, executes re-scans, and classifies status (`VERIFIED`, `NEEDS_REVIEW`, `FAILED`).
- **Developer Workflows**:
  - **CLI (`zta`)**: Text, JSON, SARIF 2.1.0, and HTML reports; file watch mode.
  - **LSP Server (`@zeroguard/lsp`)**: Sub-second in-memory diagnostics using SHA-256 content-hash caching.
  - **VS Code Extension (`@zeroguard/vscode`)**: Real-time editor diagnostics, status bar state, and QuickFix code actions.
  - **GitHub Action**: Native SARIF upload integration for PR code scanning.

---

## 📦 Monorepo Architecture

ZeroGuard is structured as a pnpm monorepo managed with Turborepo:

```
ZeroGuard/
├── packages/
│   ├── core/         # Parsing, Security Graph, Taint Engine, Rule Evaluator & Remediation
│   ├── rules/        # Declarative YAML rule definitions (OWASP API Top 10)
│   ├── cli/          # Command-Line Interface (`zta`) and report generators
│   ├── lsp/          # Language Server Protocol implementation with SHA-256 caching
│   └── vscode/       # VS Code Extension client & status bar manager
├── .github/
│   ├── actions/      # Reusable GitHub Action (`zeroguard-scan`)
│   └── workflows/    # CI workflow definitions
└── Dockerfile        # Containerized scanner build
```

---

## 🛠️ Quick Start

### Prerequisites

- **Node.js**: `>= 18.0.0`
- **pnpm**: `>= 8.0.0`

### Installation

```bash
# Clone repository
git clone https://github.com/Himanshu0523/ZeroGuard-.git
cd ZeroGuard-

# Install workspace dependencies
pnpm install

# Build all packages across monorepo
pnpm build
```

---

## 💻 CLI Usage (`zta`)

### Initialize Config

Generates `zta.config.yaml` in the current working directory:

```bash
pnpm --filter @zeroguard/cli dev init
```

### Validate Config

```bash
pnpm --filter @zeroguard/cli dev validate zta.config.yaml
```

### Scan Files or Directories

```bash
# Scan a single file with text output
pnpm --filter @zeroguard/cli dev scan packages/core/tests/fixtures/graph-vulnerable.ts

# Export SARIF format for CI/CD integrations
pnpm --filter @zeroguard/cli dev scan packages/core/tests/fixtures/graph-vulnerable.ts --format sarif --output results.sarif

# Export HTML report
pnpm --filter @zeroguard/cli dev scan packages/core/tests/fixtures/graph-vulnerable.ts --format html --output report.html

# Run scan in watch mode
pnpm --filter @zeroguard/cli dev scan src/ --watch
```

### Automated Fix & Patch Verification

```bash
pnpm --filter @zeroguard/cli dev fix packages/core/tests/fixtures/graph-vulnerable.ts --yes
```

---

## 🧪 Testing

Run Vitest unit and integration suites across all packages:

```bash
pnpm test
```

---

## 📄 License

Distributed under the **Apache-2.0 License**. See [`LICENSE`](./LICENSE) for details.
