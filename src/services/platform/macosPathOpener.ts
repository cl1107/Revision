import { resolveAbsolutePath } from '../../domain/editor';
import type { CommandRunner } from '../svn/commandRunner';
import type { PathOpener } from './pathOpener';

export { resolveAbsolutePath };

export class MacOSPathOpener implements PathOpener {
  constructor(private readonly runner: CommandRunner) {}

  async openPath(path: string): Promise<void> {
    const target = resolveAbsolutePath(path);
    if (!target) return;
    await this.runner.run({
      argv: ['open', target],
    });
  }

  async revealPaths(paths: readonly string[]): Promise<void> {
    const targets = uniqueAbsolutePaths(paths);
    if (targets.length === 0) return;
    await this.runner.run({
      argv: ['open', '-R', ...targets],
    });
  }

  async openInVsCode(path: string): Promise<void> {
    const target = resolveAbsolutePath(path);
    if (!target) return;
    try {
      await this.runner.run({
        argv: ['open', '-b', 'com.microsoft.VSCode', target],
      });
    } catch {
      await this.runner.run({
        argv: ['open', '-a', 'Visual Studio Code', target],
      });
    }
  }
}

function uniqueAbsolutePaths(paths: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    const target = resolveAbsolutePath(path);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    out.push(target);
  }
  return out;
}
