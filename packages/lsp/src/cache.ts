import * as crypto from 'crypto';

interface CacheEntry {
  contentHash: string;
  graph?: any;
  findings?: any[];
  lastUpdated: number;
}

export class AnalysisCache {
  private cache = new Map<string, CacheEntry>();

  private hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  get(uri: string, content: string): CacheEntry | undefined {
    const entry = this.cache.get(uri);
    if (entry && entry.contentHash === this.hash(content)) {
      return entry;
    }
    return undefined;
  }

  set(uri: string, content: string, data: Partial<CacheEntry>) {
    const hash = this.hash(content);
    this.cache.set(uri, {
      contentHash: hash,
      graph: data.graph,
      findings: data.findings,
      lastUpdated: Date.now()
    });
  }

  invalidate(uri: string) {
    this.cache.delete(uri);
  }
}
