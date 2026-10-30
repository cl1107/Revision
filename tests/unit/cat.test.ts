import { describe, expect, test } from 'bun:test';
import { readRevisionCat } from '../../src/services/svn/cat';
import type { CommandRequest, CommandResult } from '../../src/services/svn/commandRunner';

class FakeRunner {
  constructor(private readonly handler: (request: CommandRequest) => Promise<CommandResult>) {}

  async run(request: CommandRequest): Promise<CommandResult> {
    return this.handler(request);
  }
}

describe('readRevisionCat', () => {
  test('passes svn cat --non-interactive -r <rev> -- <target>', async () => {
    let capturedRequest: CommandRequest | null = null;
    const runner = new FakeRunner(async (req) => {
      capturedRequest = req;
      return { exitCode: 0, stdout: 'file content\n', stderr: '' };
    });

    const result = await readRevisionCat(runner as never, {
      cwd: '/path/to/wc',
      target: '^/trunk/file.txt@123',
      revision: 123,
    });

    expect(result).toBe('file content\n');
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual([
      'svn',
      'cat',
      '--non-interactive',
      '-r',
      '123',
      '--',
      '^/trunk/file.txt@123',
    ]);
    expect(capturedRequest!.cwd).toBe('/path/to/wc');
  });

  test('omits -r if revision is not passed', async () => {
    let capturedRequest: CommandRequest | null = null;
    const runner = new FakeRunner(async (req) => {
      capturedRequest = req;
      return { exitCode: 0, stdout: 'head content', stderr: '' };
    });

    await readRevisionCat(runner as never, {
      cwd: '/path/to/wc',
      target: '^/trunk/file.txt',
    });

    expect(capturedRequest!.argv).toEqual([
      'svn',
      'cat',
      '--non-interactive',
      '--',
      '^/trunk/file.txt',
    ]);
  });
});
