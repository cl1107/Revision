import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildAgyCommitPrompt,
  cleanCommitMessage,
  truncateDiff,
} from '../../domain/agyCommit';
import type { CommandRunner } from '../svn/commandRunner';

export const AGY_CANDIDATES = [
  path.join(os.homedir(), '.super.engineering', 'bin', 'agy'),
  path.join(os.homedir(), '.local', 'bin', 'agy'),
  '/opt/homebrew/bin/agy',
  '/usr/local/bin/agy',
  '/usr/bin/agy',
];

export function resolveAgyExecutable(configuredPath = ''): string {
  const configured = configuredPath.trim();
  if (configured) return configured;

  const which = Bun.which('agy');
  if (which) return which;

  for (const candidate of AGY_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return 'agy';
}

export function isAgyInstalled(): boolean {
  if (Bun.which('agy')) return true;
  for (const candidate of AGY_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

export interface AgyClient {
  generateCommitMessage(
    diff: string,
    options?: { model?: string; signal?: AbortSignal },
  ): Promise<string>;
}

export class CliAgyClient implements AgyClient {
  constructor(private readonly runner: CommandRunner) {}

  async generateCommitMessage(
    diff: string,
    options?: { model?: string; signal?: AbortSignal },
  ): Promise<string> {
    const agyPath = resolveAgyExecutable();
    const truncated = truncateDiff(diff);
    const prompt = buildAgyCommitPrompt(truncated);
    const argv = [agyPath];
    if (options?.model) {
      argv.push('--model', options.model);
    }

    const result = await this.runner.run({
      argv,
      stdin: prompt,
      signal: options?.signal,
    });

    const cleaned = cleanCommitMessage(result.stdout);
    if (!cleaned) {
      const errDetail = result.stderr.trim();
      throw new Error(`agy 返回了空提交信息${errDetail ? `: ${errDetail}` : ''}`);
    }
    return cleaned;
  }
}
