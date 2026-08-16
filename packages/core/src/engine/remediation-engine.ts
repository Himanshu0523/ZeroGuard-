import { Finding, RemediationResult, VerificationResult, Fix } from '../types';
import { Scanner } from '../scanner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class RemediationEngine {
  constructor(private scanner: Scanner) {}

  /**
   * Apply a fix and verify if the finding is resolved.
   */
  async applyAndVerify(
    filePath: string,
    originalContent: string,
    finding: Finding,
    fix?: Fix
  ): Promise<RemediationResult> {
    const selectedFix = fix || finding.fixes[0];
    if (!selectedFix) {
      throw new Error('No fix available for finding');
    }

    const lines = originalContent.split('\n');
    const startLine = Math.max(0, finding.line - 1);
    const endLine = Math.max(0, (finding.endLine || finding.line) - 1);
    const fixLines = selectedFix.code.split('\n');

    const newLines = [
      ...lines.slice(0, startLine),
      ...fixLines,
      ...lines.slice(endLine + 1)
    ];
    const patchedContent = newLines.join('\n');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroguard-'));
    const tempFile = path.join(tempDir, path.basename(filePath));
    fs.writeFileSync(tempFile, patchedContent);

    const scanResult = await this.scanner.scanFile(tempFile);

    const originalStillPresent = scanResult.findings.some(f =>
      f.ruleId === finding.ruleId &&
      f.line === finding.line
    );

    const verification: VerificationResult = {
      status: originalStillPresent ? 'NEEDS_REVIEW' : 'VERIFIED',
      newFindings: scanResult.findings,
      originalFindingStillPresent: originalStillPresent,
      message: originalStillPresent
        ? 'Finding still present after fix'
        : 'Finding resolved'
    };

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }

    return {
      findingId: finding.id,
      fixIndex: finding.fixes.indexOf(selectedFix),
      applied: true,
      patch: patchedContent,
      verification
    };
  }
}
