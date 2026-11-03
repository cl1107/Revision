import { describe, expect, test } from 'bun:test';
import { CliAgyClient, isAgyInstalled, resolveAgyExecutable } from '../../src/services/agy/AgyClient';
import type { CommandRequest, CommandResult, CommandRunner } from '../../src/services/svn/commandRunner';

class FakeCommandRunner implements CommandRunner {
  lastRequest?: CommandRequest;
  response: CommandResult = { exitCode: 0, stdout: 'feat(core): 完成功能', stderr: '' };

  async run(request: CommandRequest): Promise<CommandResult> {
    this.lastRequest = request;
    return this.response;
  }
}

describe('AgyClient', () => {
  test('resolveAgyExecutable returns string', () => {
    const exe = resolveAgyExecutable();
    expect(typeof exe).toBe('string');
    expect(exe.length).toBeGreaterThan(0);
  });

  test('isAgyInstalled detects system agy or candidates', () => {
    expect(typeof isAgyInstalled()).toBe('boolean');
  });

  test('CliAgyClient sends prompt to runner and cleans output', async () => {
    const fakeRunner = new FakeCommandRunner();
    fakeRunner.response = {
      exitCode: 0,
      stdout: '```markdown\nfeat(ui): 增加新按钮\n\n- 添加按钮UI\n```',
      stderr: '',
    };
    const client = new CliAgyClient(fakeRunner as unknown as CommandRunner);
    const message = await client.generateCommitMessage('test diff content', { model: 'gemini-3.8-flash-low' });

    expect(message).toBe('feat(ui): 增加新按钮\n\n- 添加按钮UI');
    expect(fakeRunner.lastRequest?.argv).toContain('--model');
    expect(fakeRunner.lastRequest?.argv).toContain('gemini-3.8-flash-low');
    expect(typeof fakeRunner.lastRequest?.stdin).toBe('string');
    expect(fakeRunner.lastRequest?.stdin).toContain('test diff content');
  });

  test('CliAgyClient throws if agy returns empty message', async () => {
    const fakeRunner = new FakeCommandRunner();
    fakeRunner.response = { exitCode: 0, stdout: '   ', stderr: '' };
    const client = new CliAgyClient(fakeRunner as unknown as CommandRunner);
    await expect(client.generateCommitMessage('diff')).rejects.toThrow('agy 返回了空提交信息');
  });
});
