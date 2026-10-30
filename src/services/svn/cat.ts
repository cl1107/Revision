import type { CommandRunner } from './commandRunner';

export interface ReadRevisionCatInput {
  cwd: string;
  target: string;
  revision?: number;
  signal?: AbortSignal;
}

export async function readRevisionCat(
  runner: CommandRunner,
  input: ReadRevisionCatInput,
): Promise<string> {
  const argv = ['svn', 'cat', '--non-interactive'];
  if (input.revision !== undefined) {
    argv.push('-r', String(input.revision));
  }
  argv.push('--', input.target);

  const result = await runner.run({
    argv,
    cwd: input.cwd,
    signal: input.signal,
  });
  return result.stdout;
}
