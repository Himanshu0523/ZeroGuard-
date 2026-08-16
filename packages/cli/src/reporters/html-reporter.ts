import { ScanResult } from '@zeroguard/core';

export class HTMLReporter {
  report(result: ScanResult): string {
    const escape = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const severityClass = (sev: string) => sev.toLowerCase();

    const rows = result.findings.map(f => `
      <tr class="severity-${severityClass(f.severity)}">
        <td>${escape(f.ruleId)}</td>
        <td>${escape(f.ruleName)}</td>
        <td>${escape(f.file)}:${f.line}</td>
        <td>${escape(f.message)}</td>
        <td>${(f.confidence*100).toFixed(0)}%</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ZeroGuard Scan Report</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary div { padding: 15px; border-radius: 5px; }
    .critical { background: #fdd; }
    .high { background: #fec; }
    .medium { background: #eef; }
    .low { background: #efe; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .severity-critical { background: #fee; }
    .severity-high { background: #fef; }
    .severity-medium { background: #eef; }
    .severity-low { background: #efe; }
  </style>
</head>
<body>
  <h1>ZeroGuard API Security Report</h1>
  <p>Generated: ${result.timestamp}</p>
  <div class="summary">
    <div class="critical">Critical: ${result.summary.critical}</div>
    <div class="high">High: ${result.summary.high}</div>
    <div class="medium">Medium: ${result.summary.medium}</div>
    <div class="low">Low: ${result.summary.low}</div>
  </div>
  <table>
    <tr><th>Rule</th><th>Name</th><th>Location</th><th>Message</th><th>Confidence</th></tr>
    ${rows}
  </table>
</body>
</html>`;
  }
}
