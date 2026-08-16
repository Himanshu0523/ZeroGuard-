import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  CodeAction,
  CodeActionKind,
  Diagnostic,
  DiagnosticSeverity
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Analyzer } from './analyzer';
import { DocumentManager } from './document-manager';
import { Scanner, Finding } from '@zeroguard/core';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let scanner: Scanner;
let analyzer: Analyzer;
const docManager = new DocumentManager();

let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(capabilities.workspace && capabilities.workspace.configuration);
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      codeActionProvider: true,
      executeCommandProvider: {
        commands: ['zeroguard.applyFix']
      }
    }
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  const config = {
    rules: { owaspApiTop10: { enabled: true, severity: 'low' } },
    scan: { include: [], exclude: [] },
    report: { format: 'text' as const },
    fix: { autoFix: false, aiAssisted: false }
  };
  scanner = new Scanner(config);
  scanner.initialize().then(() => {
    analyzer = new Analyzer(scanner);
    for (const doc of documents.all()) {
      updateDiagnostics(doc);
    }
  });
});

documents.onDidOpen(event => {
  docManager.set(event.document.uri, event.document);
  if (analyzer) {
    updateDiagnostics(event.document);
  }
});

documents.onDidChangeContent(event => {
  docManager.set(event.document.uri, event.document);
  if (analyzer) {
    updateDiagnostics(event.document);
  }
});

documents.onDidClose(event => {
  docManager.delete(event.document.uri);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

connection.onNotification('zeroguard/forceScan', async (params: { uri: string }) => {
  const doc = docManager.get(params.uri);
  if (doc) {
    await updateDiagnostics(doc);
  }
});

async function updateDiagnostics(document: TextDocument) {
  if (!analyzer) return;
  const findings = await analyzer.analyze(document.uri, document.getText());
  const diagnostics = findings.map(f => findingToDiagnostic(f));
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

function findingToDiagnostic(finding: Finding): Diagnostic {
  return {
    range: {
      start: { line: Math.max(0, finding.line - 1), character: Math.max(0, finding.column) },
      end: { line: Math.max(0, (finding.endLine || finding.line) - 1), character: Math.max(0, finding.endColumn || finding.column + 1) }
    },
    message: finding.message,
    severity: mapSeverity(finding.severity),
    source: 'zeroguard',
    code: finding.ruleId,
    data: {
      findingId: finding.id,
      fixes: finding.fixes
    }
  };
}

function mapSeverity(sev: string): DiagnosticSeverity {
  switch (sev) {
    case 'critical': return DiagnosticSeverity.Error;
    case 'high': return DiagnosticSeverity.Error;
    case 'medium': return DiagnosticSeverity.Warning;
    case 'low': return DiagnosticSeverity.Information;
    default: return DiagnosticSeverity.Hint;
  }
}

connection.onCodeAction((params) => {
  const actions: CodeAction[] = [];
  for (const diagnostic of params.context.diagnostics) {
    const data = (diagnostic as any).data;
    if (!data || !data.fixes) continue;
    for (const fix of data.fixes) {
      const action: CodeAction = {
        title: fix.title,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: diagnostic.range,
                newText: fix.code
              }
            ]
          }
        }
      };
      actions.push(action);
    }
  }
  return actions;
});

connection.onExecuteCommand(async (params) => {
  if (params.command === 'zeroguard.applyFix' && params.arguments) {
    const [uri, fixCode, range] = params.arguments;
    const edit = {
      changes: {
        [uri]: [{ range, newText: fixCode }]
      }
    };
    await connection.workspace.applyEdit(edit);
  }
});

documents.listen(connection);
connection.listen();
