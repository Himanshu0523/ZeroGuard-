import { glob } from 'glob';
import * as path from 'path';

export async function findFiles(
  patterns: string[],
  exclude: string[],
  cwd: string
): Promise<string[]> {
  const files = new Set<string>();
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      ignore: exclude,
      nodir: true,
      absolute: false
    });
    for (const match of matches) {
      files.add(path.resolve(cwd, match));
    }
  }
  return Array.from(files);
}
