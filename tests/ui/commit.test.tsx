import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { OperationManager } from '../../src/application/operationManager';
import { ChangesPanel } from '../../src/features/changes/ChangesPanel';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import { RepositoryStoreProvider } from '../../src/store/RepositoryStoreContext';
import { createRepositoryStore } from '../../src/store/repositoryStore';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { Repository } from '../../src/domain/repository';

const repo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 4,
};

const changes: WorkingCopyChange[] = [
  { path: 'a.ts', absolutePath: '/tmp/demo-wc/a.ts', status: 'modified' },
  { path: 'scratch.txt', absolutePath: '/tmp/demo-wc/scratch.txt', status: 'unversioned' },
];

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

import { simulateClick as click } from '../helpers';

describe('Commit UI', () => {
  test('空 message 点 Commit 不会触发回调', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      let calls = 0;
      const store = createRepositoryStore({
        changes,
        checkedPaths: ['a.ts'],
        selectedPath: 'a.ts',
        commitMessage: '',
      });
      render(
        <RepositoryStoreProvider store={store}>
          <ChangesPanel
            onCommit={() => {
              calls += 1;
            }}
            onRefresh={() => {}}
          />
        </RepositoryStoreProvider>,
      );
      renderer.flush();
      click(renderer, 'commit-button');
      renderer.flush();
      expect(calls).toBe(0);
    } finally {
      unmount();
    }
  });

  test('成功提交后清空 message / selection 并 refresh', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let committed = false;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return committed ? { ...repo, revision: 5 } : repo;
            },
            async getStatus() {
              return committed ? [] : changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async commit(_root, paths, message) {
              expect(paths).toEqual(['a.ts']);
              expect(message).toBe('ship it');
              committed = true;
              return { revision: 5, output: 'Committed revision 5.\n' };
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      expect(renderer.getAllText()).toContain('1 selected');
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('No changed files'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('0 selected');
      expect(renderer.getAllText()).toContain('r5');
    } finally {
      unmount();
    }
  });

  test('提交中禁用 Commit / Update / Revert / Add / Delete', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let release: () => void = () => {};
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            commit() {
              return new Promise((resolve) => {
                release = () => resolve({ revision: 5, output: 'Committed revision 5.\n' });
              });
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('Committing…'));
      expect(renderer.getAllText()).toContain('Committing…');
      expect(renderer.findByTestId('update-button')).toBeTruthy();
      release();
      await waitFor(() => !renderer.getAllText().includes('Committing…'));
    } finally {
      unmount();
    }
  });

  test('提交失败保留 message 和 selection', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage="ship it"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async commit() {
              throw new Error('commit exploded');
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      click(renderer, 'commit-button');
      await waitFor(() => renderer.getAllText().includes('commit exploded'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('1 selected');
      expect(renderer.getAllText()).toContain('a.ts');
    } finally {
      unmount();
    }
  });

  test('Revert 确认框 Cancel 不执行', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let reverted = 0;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          operations={new OperationManager()}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async revert() {
              reverted += 1;
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      renderer.flush();
      click(renderer, 'revert-file');
      await waitFor(() => Boolean(renderer.findByTestId('revert-confirm')));
      expect(renderer.getAllText()).toContain('Local modifications will be permanently discarded.');
      click(renderer, 'revert-confirm-cancel');
      await Bun.sleep(20);
      renderer.flush();
      expect(reverted).toBe(0);
      expect(renderer.findByTestId('revert-confirm')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('Agy Commit 按钮点击后调用 agy 生成提交信息并填入输入框', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let diffCalled = false;
      let agyCalled = false;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage=""
          operations={new OperationManager()}
          agy={{
            async generateCommitMessage(diff) {
              agyCalled = true;
              expect(diff).toContain('diff --git');
              return 'feat(test): auto generated commit';
            },
          }}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async getWorkingCopyChangesDiff(_root, paths) {
              diffCalled = true;
              expect(paths).toEqual(['a.ts']);
              return 'diff --git a/a.ts b/a.ts\n+hello';
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      expect(Boolean(renderer.findByTestId('agy-commit-button'))).toBe(true);

      click(renderer, 'agy-commit-button');
      await waitFor(() => agyCalled && diffCalled);

      await waitFor(() => {
        renderer.flush();
        const input = renderer.findByTestId('commit-message');
        return input?.customProps?.value === 'feat(test): auto generated commit';
      });
    } finally {
      unmount();
    }
  });

  test('Agy Commit 失败时显示错误 banner', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage=""
          operations={new OperationManager()}
          agy={{
            async generateCommitMessage() {
              throw new Error('网络异常或 agy 进程退出');
            },
          }}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async getWorkingCopyChangesDiff() {
              return 'diff --git a/a.ts b/a.ts\n+hello';
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));

      click(renderer, 'agy-commit-button');
      await waitFor(() => {
        renderer.flush();
        return Boolean(renderer.findByTestId('agy-commit-error'));
      });

      expect(renderer.getAllText().join(' ')).toContain('网络异常或 agy 进程退出');
    } finally {
      unmount();
    }
  });

  test('AI Commit 按钮点击后通过自定义 AI Provider 生成提交信息', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let aiCalled = false;
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage=""
          operations={new OperationManager()}
          aiSettings={{
            endpoint: 'https://api.openai.com/v1',
            apiKey: 'sk-test',
            model: 'gpt-4o',
          }}
          ai={{
            async listModels() {
              return ['gpt-4o'];
            },
            async generateCommitMessage(input) {
              aiCalled = true;
              expect(input.model).toBe('gpt-4o');
              expect(input.diff).toContain('diff --git');
              return 'feat(ai): custom openai generated commit';
            },
          }}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async getWorkingCopyChangesDiff() {
              return 'diff --git a/a.ts b/a.ts\n+hello';
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));
      expect(Boolean(renderer.findByTestId('ai-commit-button'))).toBe(true);

      click(renderer, 'ai-commit-button');
      await waitFor(() => aiCalled);

      await waitFor(() => {
        renderer.flush();
        const input = renderer.findByTestId('commit-message');
        return input?.customProps?.value === 'feat(ai): custom openai generated commit';
      });
    } finally {
      unmount();
    }
  });

  test('AI Commit 未配置模型时展示提示错误', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          initialCommitMessage=""
          operations={new OperationManager()}
          aiSettings={{
            endpoint: '',
            apiKey: '',
            model: '',
          }}
          ai={{
            async listModels() {
              return [];
            },
            async generateCommitMessage() {
              return '';
            },
          }}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return changes;
            },
            async getDiff() {
              return { kind: 'text', patch: 'diff --git a/a.ts b/a.ts\n' };
            },
            async getWorkingCopyChangesDiff() {
              return 'diff --git a/a.ts b/a.ts\n+hello';
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-a.ts')));

      click(renderer, 'ai-commit-button');
      await waitFor(() => {
        renderer.flush();
        return Boolean(renderer.findByTestId('ai-commit-error'));
      });

      expect(renderer.getAllText().join(' ')).toContain('未配置 AI 模型');
    } finally {
      unmount();
    }
  });
});
