import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CommandRequest, CommandResult } from '../../src/services/svn/commandRunner';
import { MacOSPathOpener, resolveAbsolutePath } from '../../src/services/platform/macosPathOpener';

class FakeRunner {
  constructor(private readonly impl: (request: CommandRequest) => Promise<CommandResult>) {}
  run(request: CommandRequest) {
    return this.impl(request);
  }
}

describe('MacOSPathOpener', () => {
  test('resolveAbsolutePath converts ~ and ~/ to absolute home directory path', () => {
    expect(resolveAbsolutePath('~', '/custom/home')).toBe('/custom/home');
    expect(resolveAbsolutePath('~/repo/svn', '/custom/home')).toBe('/custom/home/repo/svn');
    expect(resolveAbsolutePath('/var/svn/repo', '/custom/home')).toBe('/var/svn/repo');
  });

  test('openPath calls runner with open <absolutePath> and does not pass -R', async () => {
    let capturedRequest: CommandRequest | null = null;
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        capturedRequest = request;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openPath('/Users/alice/projects/repo');

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual(['open', '/Users/alice/projects/repo']);
    expect(capturedRequest!.argv).not.toContain('-R');
  });

  test('openPath with ~ expands home directory', async () => {
    let capturedRequest: CommandRequest | null = null;
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        capturedRequest = request;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openPath('~/my-working-copy');

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual(['open', join(homedir(), 'my-working-copy')]);
  });

  test('openPath with empty or whitespace string does not run command', async () => {
    let ran = false;
    const opener = new MacOSPathOpener(
      new FakeRunner(async () => {
        ran = true;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openPath('   ');
    expect(ran).toBe(false);
  });

  test('revealPaths calls runner with open -R and unique absolute paths', async () => {
    let capturedRequest: CommandRequest | null = null;
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        capturedRequest = request;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.revealPaths(['/tmp/demo-wc/src/a.ts', '/tmp/demo-wc/src/a.ts', '  ']);

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual(['open', '-R', '/tmp/demo-wc/src/a.ts']);
  });

  test('revealPaths with empty list does not run command', async () => {
    let ran = false;
    const opener = new MacOSPathOpener(
      new FakeRunner(async () => {
        ran = true;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.revealPaths([]);
    expect(ran).toBe(false);
  });

  test('openInVsCode calls runner with open -b com.microsoft.VSCode <absolutePath>', async () => {
    let capturedRequest: CommandRequest | null = null;
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        capturedRequest = request;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openInVsCode('/Users/alice/projects/repo/src/index.ts');

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual(['open', '-b', 'com.microsoft.VSCode', '/Users/alice/projects/repo/src/index.ts']);
  });

  test('openInVsCode with ~ expands home directory', async () => {
    let capturedRequest: CommandRequest | null = null;
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        capturedRequest = request;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openInVsCode('~/work/frontend-web');

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.argv).toEqual(['open', '-b', 'com.microsoft.VSCode', join(homedir(), 'work/frontend-web')]);
  });

  test('openInVsCode falls back to open -a "Visual Studio Code" if -b fails', async () => {
    const requests: CommandRequest[] = [];
    const opener = new MacOSPathOpener(
      new FakeRunner(async (request) => {
        requests.push(request);
        if (request.argv[1] === '-b') {
          throw new Error('Application not found');
        }
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openInVsCode('/tmp/my-project');

    expect(requests).toHaveLength(2);
    expect(requests[0].argv).toEqual(['open', '-b', 'com.microsoft.VSCode', '/tmp/my-project']);
    expect(requests[1].argv).toEqual(['open', '-a', 'Visual Studio Code', '/tmp/my-project']);
  });

  test('openInVsCode with empty string does not run command', async () => {
    let ran = false;
    const opener = new MacOSPathOpener(
      new FakeRunner(async () => {
        ran = true;
        return { exitCode: 0, stdout: '', stderr: '' };
      }) as never,
    );

    await opener.openInVsCode('   ');
    expect(ran).toBe(false);
  });
});
