import { Scanner, Finding } from '@zeroguard/core';
import { AnalysisCache } from './cache';
import { fileURLToPath } from 'url';

export class Analyzer {
  private cache: AnalysisCache;

  constructor(private scanner: Scanner) {
    this.cache = new AnalysisCache();
  }

  /**
   * Analyze a single document and return findings.
   * Uses cache if content unchanged.
   */
  async analyze(uri: string, content: string): Promise<Finding[]> {
    const cached = this.cache.get(uri, content);
    if (cached && cached.findings) {
      return cached.findings;
    }

    const filePath = this.uriToPath(uri);
    const scanResult = await this.scanner.scanFile(filePath, content);
    const findings = scanResult.findings;
    this.cache.set(uri, content, { findings });
    return findings;
  }

  private uriToPath(uri: string): string {
    try {
      return fileURLToPath(uri);
    } catch {
      return uri.replace(/^file:\/\//, '');
    }
  }
}
