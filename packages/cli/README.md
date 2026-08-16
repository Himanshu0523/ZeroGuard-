# @zeroguard/cli

Command-Line Interface (`zta`) for ZeroGuard API Security Scanner.

## Commands

- `zta scan [path]`: Scans source files (`.ts`, `.js`, `.tsx`, `.jsx`) or OpenAPI specs (`.yaml`, `.json`).
  - `--format`: `text` (default), `json`, `sarif`, `html`.
  - `--output`: File output path.
  - `--severity`: `critical`, `high`, `medium`, `low` (default), `info`.
  - `--watch`: Monitor directory for changes and re-scan automatically.
- `zta fix [path]`: Interactive/automated patch application and verification.
  - `--yes`: Auto-confirm patch application.
- `zta init`: Generates default `zta.config.yaml`.
- `zta validate [config]`: Validates syntax of configuration YAML/JSON files.
