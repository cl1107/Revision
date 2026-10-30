import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { App } from '../../src/app/App';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import { Sidebar } from '../../src/features/repository/Sidebar';
import type { WorkingCopyChange } from '../../src/domain/change';
import type { Repository } from '../../src/domain/repository';
import type { PathOpener } from '../../src/services/platform/pathOpener';
import { RepositoryStoreProvider } from '../../src/store/RepositoryStoreContext';
import { createRepositoryStore } from '../../src/store/repositoryStore';
import { simulateClick } from '../helpers';

const liveRepo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 4,
};

const liveChanges: WorkingCopyChange[] = [
  { path: 'src/a.ts', absolutePath: '/tmp/demo-wc/src/a.ts', status: 'modified' },
  { path: 'scratch.txt', absolutePath: '/tmp/demo-wc/scratch.txt', status: 'unversioned' },
];

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

describe('Figma 主界面', () => {
  test('Changes 三栏包含 Sidebar、文件列表和 Diff', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(<App preview="changes" />);
      renderer.flush();
      const texts = renderer.getAllText();
      expect(renderer.findByTestId('sidebar')).toBeTruthy();
      expect(renderer.findByTestId('changes-panel')).toBeTruthy();
      expect(renderer.findByTestId('diff-panel')).toBeTruthy();
      expect(texts).toContain('Changes');
      expect(texts).toContain('frontend-web');
      expect(texts).toContain('src/components/UserCard.vue');
      expect(texts).toContain('Select all');
      expect(renderer.findByTestId('refresh-button')).toBeTruthy();
    } finally {
      unmount();
    }
  });

  test('打开 working copy 后展示 Changed Files，默认勾选 modified', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let statusCalls = 0;
      render(
        <RepositoryScreen
          repository={liveRepo}
          svn={{
            async validateWorkingCopy() {
              return liveRepo;
            },
            async getStatus() {
              statusCalls += 1;
              return liveChanges;
            },
            async getDiff() {
              return { kind: 'text' as const, patch: 'diff --git a/src/a.ts b/src/a.ts\n' };
            },
          }}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('change-src/a.ts')));
      renderer.flush();
      expect(renderer.findByTestId('sidebar')).toBeTruthy();
      expect(renderer.findByTestId('changes-panel')).toBeTruthy();
      expect(renderer.findByTestId('repository-placeholder')).toBeUndefined();
      expect(renderer.getAllText()).toContain('demo-wc');
      expect(renderer.getAllText()).toContain('r4');
      const texts = renderer.getAllText();
      expect(texts).toContain('src/a.ts');
      expect(texts).toContain('scratch.txt');
      expect(texts).toContain('1 selected');
      expect(texts).toContain('2 files');
      expect(texts).toContain('2 local changes');

      simulateClick(renderer, 'refresh-button');
      await waitFor(() => statusCalls >= 2);
      renderer.flush();
      expect(statusCalls).toBeGreaterThanOrEqual(2);
    } finally {
      unmount();
    }
  });

  test('从其他页面切到 Changes 时自动刷新 status', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      let statusCalls = 0;
      render(
        <RepositoryScreen
          initialPage="history"
          repository={liveRepo}
          svn={{
            async validateWorkingCopy() {
              return liveRepo;
            },
            async getStatus() {
              statusCalls += 1;
              return liveChanges;
            },
            async getDiff() {
              return { kind: 'text' as const, patch: 'diff --git a/src/a.ts b/src/a.ts\n' };
            },
          }}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
        />,
      );
      renderer.flush();
      await waitFor(() => statusCalls >= 1);
      const afterOpen = statusCalls;

      simulateClick(renderer, 'nav-changes');
      await waitFor(() => statusCalls > afterOpen);
      renderer.flush();
      expect(renderer.findByTestId('changes-panel')).toBeTruthy();

      simulateClick(renderer, 'nav-history');
      renderer.flush();
      const afterLeave = statusCalls;
      simulateClick(renderer, 'nav-changes');
      await waitFor(() => statusCalls > afterLeave);
      renderer.flush();
      expect(renderer.findByTestId('changes-panel')).toBeTruthy();
    } finally {
      unmount();
    }
  });

  test('History 显示 revision 列表', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(<App preview="history" />);
      renderer.flush();
      expect(renderer.findByTestId('history-view')).toBeTruthy();
      expect(renderer.getAllText()).toContain('History');
      expect(renderer.findByTestId('revision-18431')).toBeTruthy();
    } finally {
      unmount();
    }
  });

  test('Sidebar Quick action: Reveal in Finder 点击 reveal 当前选中文件', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      const revealed: string[][] = [];
      const mockOpener: PathOpener = {
        async openPath() {},
        async revealPaths(paths) {
          revealed.push([...paths]);
        },
        async openInVsCode() {},
      };

      render(
        <RepositoryScreen
          repository={liveRepo}
          svn={{
            async validateWorkingCopy() {
              return liveRepo;
            },
            async getStatus() {
              return liveChanges;
            },
            async getDiff() {
              return { kind: 'text' as const, patch: 'diff --git a/src/a.ts b/src/a.ts\n' };
            },
          }}
          opener={mockOpener}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('select-src/a.ts')));
      renderer.flush();

      simulateClick(renderer, 'select-src/a.ts');
      renderer.flush();

      const action = renderer.findByTestId('reveal-in-finder');
      expect(action).toBeTruthy();
      expect(renderer.getAllText()).toContain('Reveal in Finder');
      expect(renderer.findByTestId('show-in-finder')).toBeUndefined();

      simulateClick(renderer, 'reveal-in-finder');
      renderer.flush();

      expect(revealed).toEqual([['/tmp/demo-wc/src/a.ts']]);
    } finally {
      unmount();
    }
  });

  test('Sidebar Quick action: Reveal in Finder 在 SVN mutation 期间仍保持启用', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      const revealed: string[][] = [];

      const store = createRepositoryStore({
        changes: liveChanges,
        repository: liveRepo,
        selectedPath: 'src/a.ts',
      });
      store.getState().tryBeginMutation('update');

      render(
        <RepositoryStoreProvider store={store}>
          <Sidebar
            workingCopyName="demo-wc"
            workingCopyPath="~/demo-wc"
            currentPath="/tmp/demo-wc"
            revision={4}
            syncLabel="Updating…"
            onUpdate={() => {}}
            onRevealInFinder={() => {
              revealed.push(['/tmp/demo-wc/src/a.ts']);
            }}
          />
        </RepositoryStoreProvider>,
      );
      renderer.flush();

      const action = renderer.findByTestId('reveal-in-finder');
      expect(action).toBeTruthy();

      simulateClick(renderer, 'reveal-in-finder');
      renderer.flush();

      expect(revealed).toEqual([['/tmp/demo-wc/src/a.ts']]);
    } finally {
      unmount();
    }
  });

  test('wc-sync 同时显示本地变更数和待接收 revision 数', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={liveRepo}
          svn={{
            async validateWorkingCopy() {
              return liveRepo;
            },
            async getStatus() {
              return liveChanges;
            },
            async getDiff() {
              return { kind: 'text' as const, patch: '' };
            },
            async getIncomingRevisionCount() {
              return 2;
            },
          }}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
        />,
      );
      renderer.flush();
      await waitFor(() => renderer.getAllText().includes('2 local changes · 2 behind'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('2 local changes · 2 behind');
    } finally {
      unmount();
    }
  });

  test('wc-sync 无本地变更时显示待接收 revision 数', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <RepositoryScreen
          repository={liveRepo}
          svn={{
            async validateWorkingCopy() {
              return liveRepo;
            },
            async getStatus() {
              return [];
            },
            async getDiff() {
              return { kind: 'text' as const, patch: '' };
            },
            async getIncomingRevisionCount() {
              return 3;
            },
          }}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          svnVersion="1.14.5"
        />,
      );
      renderer.flush();
      await waitFor(() => renderer.getAllText().includes('3 behind'));
      renderer.flush();
      expect(renderer.getAllText()).toContain('3 behind');
    } finally {
      unmount();
    }
  });
});
