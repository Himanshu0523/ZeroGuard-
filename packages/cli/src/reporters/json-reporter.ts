import { ScanResult } from '@zeroguard/core';

export class JSONReporter {
  report(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  }
}
