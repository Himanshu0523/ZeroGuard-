# ZeroGuard — API Security Scanner

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=zeroguard.zeroguard)
[![OWASP](https://img.shields.io/badge/OWASP-API%20Top%2010%202023-red)](https://owasp.org/www-project-api-security/)

> **Real-time OWASP API Security Top 10 vulnerability detection — directly inside VS Code.**

---

## ✨ Features

- 🔍 **Real-Time Diagnostics** — Scans your TypeScript, JavaScript, YAML, and JSON files as you work
- ⚡ **Sub-Second Feedback** — SHA-256 content-hash caching avoids redundant re-scans
- 🛡️ **OWASP API Top 10 (2023)** — Covers all major API vulnerability classes
- 🔧 **QuickFix Code Actions** — One-click suggested remediation for detected issues
- 📊 **Status Bar Integration** — Live scan status and vulnerability counts
- ⌨️ **Keyboard Shortcut** — Trigger a full scan with `Ctrl+Shift+Z` (`Cmd+Shift+Z` on Mac)

---

## 🛡️ Detected Vulnerabilities

| Rule | Vulnerability Class |
|------|---------------------|
| API1:2023 | Broken Object Level Authorization (BOLA) |
| API2:2023 | Broken Authentication |
| API3:2023 | Broken Object Property Level Authorization |
| API4:2023 | Unrestricted Resource Consumption |
| API5:2023 | Broken Function Level Authorization |
| API8:2023 | Security Misconfiguration |

---

## 🚀 Getting Started

### Requirements

- VS Code `>= 1.85.0`
- Node.js `>= 18.0.0`

### Install & Activate

1. Install the **ZeroGuard** extension from the VS Code Marketplace
2. Open any TypeScript, JavaScript, YAML, or JSON file
3. ZeroGuard automatically activates and begins scanning
4. Vulnerabilities appear as inline **squiggly underlines** in the editor

---

## ⌨️ Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `ZeroGuard: Scan File/Workspace` | `Ctrl+Shift+Z` | Run a full security scan |
| `ZeroGuard: Show OWASP Rules` | — | View all active detection rules |
| `ZeroGuard: Open Settings` | — | Configure extension preferences |

---

## ⚙️ Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `zeroguard.enableOnSave` | boolean | `true` | Auto-scan when a file is saved |
| `zeroguard.severity` | string | `"low"` | Minimum severity to report (`critical`, `high`, `medium`, `low`, `info`) |
| `zeroguard.autoFix` | boolean | `false` | Automatically apply safe patches (experimental) |

---

## 🔍 How It Works

ZeroGuard uses a multi-stage analysis pipeline:

1. **AST Parsing** — Extracts routes and decorators from Express, Fastify & NestJS via tree-sitter
2. **Security Graph IR** — Builds a graph model of endpoints, auth checks, DB calls & data flows
3. **Taint Analysis** — Traces user inputs (`req.params`, `req.body`, `req.headers`) to sinks
4. **Rule Evaluation** — Evaluates declarative YAML rules against the Security Graph

---

## 🐛 Reporting Issues

Found a bug or want to request a feature?

👉 [Open an issue on GitHub](https://github.com/Himanshu0523/ZeroGuard-/issues)

---

## 📄 License

Distributed under the **Apache-2.0 License**.  
© ZeroGuard Contributors
