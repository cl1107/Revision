import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { App } from '../../src/app/App';
import type { Repository } from '../../src/domain/repository';
import type { Settings, SettingsRepository } from '../../src/services/settings/settingsRepository';
import { CommandError, type CommandRequest } from '../../src/services/svn/commandRunner';
import { OperationManager } from '../../src/application/operationManager';
import type { AppearancePreference } from '../../src/app/appearance';
import { simulateClick as click } from '../helpers';

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out waiting for condition');
}

function createAutoOpenTestServices(options: {
  lastWorkingCopy?: string;
  validateResult?: Repository;
  svnAvailable?: boolean;
}) {
  let currentSettings: Settings = {
    version: 1,
    recentWorkingCopies: options.lastWorkingCopy
      ? [{ path: options.lastWorkingCopy, lastOpenedAt: Date.now() }]
      : [],
    lastWorkingCopy: options.lastWorkingCopy,
    appearance: 'light',
  };

  const svnAvailable = options.svnAvailable ?? true;

  return {
    runner: {
      async run(request: CommandRequest) {
        if (request.argv[0] === 'svn' && svnAvailable) {
          return { exitCode: 0, stdout: '1.14.5\n', stderr: '' };
        }
        throw new CommandError({
          command: request.argv,
          exitCode: 1,
          stdout: '',
          stderr: 'svn command failed',
        });
      },
    } as never,
    svn: {
      async validateWorkingCopy(path: string) {
        if (options.validateResult) return options.validateResult;
        return {
          rootPath: path,
          repositoryUrl: 'file:///repo',
          repositoryRoot: 'file:///repo',
          revision: 1,
        };
      },
      async getStatus() {
        return [];
      },
      async getDiff() {
        return { kind: 'text', patch: '' };
      },
    } as never,
    picker: {
      async pickDirectory() {
        return null;
      },
    },
    opener: {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode() {},
    },
    settings: {
      async load() {
        return currentSettings;
      },
      async rememberWorkingCopy(path: string) {
        currentSettings = {
          ...currentSettings,
          lastWorkingCopy: path,
        };
        return currentSettings;
      },
      async clearLastWorkingCopy() {
        const next = { ...currentSettings };
        delete next.lastWorkingCopy;
        currentSettings = next;
        return currentSettings;
      },
      async setAppearance(appearance: AppearancePreference) {
        currentSettings = { ...currentSettings, appearance };
        return currentSettings;
      },
    } as unknown as SettingsRepository,
    operations: new OperationManager(),
  };
}

describe('自动打开上次工作区', () => {
  test('启动时如果 lastWorkingCopy 存在且合法，自动打开该工作区', async () => {
    if (!hasNativeTestRenderer) return;
    const testDir = await mkdtemp(join(tmpdir(), 'svn-auto-open-'));
    const services = createAutoOpenTestServices({
      lastWorkingCopy: testDir,
      validateResult: {
        rootPath: testDir,
        repositoryUrl: 'file:///repo',
        repositoryRoot: 'file:///repo',
        revision: 12,
      },
    });

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={services as never}
        />,
      );
      renderer.flush();

      // 等待异步检测和打开完成
      await waitFor(() => Boolean(renderer.findByTestId('repository-screen')));
      renderer.flush();

      // 已自动进入工作区，Titlebar 出现 Welcome screen 按钮
      expect(renderer.findByTestId('repository-screen')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-welcome')).toBeTruthy();
      expect(renderer.findByTestId('welcome-screen')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('启动时如果 lastWorkingCopy 路径不存在，停留在 WelcomeScreen 并展示错误', async () => {
    if (!hasNativeTestRenderer) return;
    const nonExistentPath = join(tmpdir(), 'non-existent-folder-' + Date.now());
    const services = createAutoOpenTestServices({
      lastWorkingCopy: nonExistentPath,
    });

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={services as never}
        />,
      );
      renderer.flush();

      // 等待打开失败后停留在 WelcomeScreen
      await waitFor(() => Boolean(renderer.findByTestId('open-error')));
      renderer.flush();

      expect(renderer.findByTestId('welcome-screen')).toBeTruthy();
      expect(renderer.findByTestId('open-error')).toBeTruthy();
      expect(renderer.findByTestId('repository-screen')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('没有 lastWorkingCopy 时停留在 WelcomeScreen', async () => {
    if (!hasNativeTestRenderer) return;
    const services = createAutoOpenTestServices({});

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={services as never}
        />,
      );
      renderer.flush();

      // 等待 svn 检测完成
      await waitFor(() => renderer.findByTestId('brand-mark') !== undefined);
      renderer.flush();

      expect(renderer.findByTestId('welcome-screen')).toBeTruthy();
      expect(renderer.findByTestId('open-error')).toBeUndefined();
      expect(renderer.findByTestId('repository-screen')).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('自动打开后点 Titlebar 的 Welcome screen 关闭工作区并清空 lastWorkingCopy', async () => {
    if (!hasNativeTestRenderer) return;
    const testDir = await mkdtemp(join(tmpdir(), 'svn-auto-open-close-'));
    const services = createAutoOpenTestServices({
      lastWorkingCopy: testDir,
      validateResult: {
        rootPath: testDir,
        repositoryUrl: 'file:///repo',
        repositoryRoot: 'file:///repo',
        revision: 5,
      },
    });

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={services as never}
        />,
      );
      renderer.flush();

      await waitFor(() => Boolean(renderer.findByTestId('repository-screen')));
      renderer.flush();

      // 点击 Titlebar 的 Welcome screen
      click(renderer, 'titlebar-welcome');
      renderer.flush();

      // 应当返回 Welcome 页面
      expect(renderer.findByTestId('welcome-screen')).toBeTruthy();
      expect(renderer.findByTestId('repository-screen')).toBeUndefined();

      // 且 settings 中的 lastWorkingCopy 被清空
      expect((await services.settings.load()).lastWorkingCopy).toBeUndefined();
    } finally {
      unmount();
    }
  });

  test('preview 模式下不自动打开 lastWorkingCopy', async () => {
    if (!hasNativeTestRenderer) return;
    const testDir = await mkdtemp(join(tmpdir(), 'svn-auto-open-preview-'));
    let validateCalled = false;
    const services = createAutoOpenTestServices({
      lastWorkingCopy: testDir,
      validateResult: {
        rootPath: testDir,
        repositoryUrl: 'file:///repo',
        repositoryRoot: 'file:///repo',
        revision: 1,
      },
    });
    // @ts-expect-error override for spy
    services.svn.validateWorkingCopy = async () => {
      validateCalled = true;
      return {
        rootPath: testDir,
        repositoryUrl: 'file:///repo',
        repositoryRoot: 'file:///repo',
        revision: 1,
      };
    };

    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      render(
        <App
          preview="changes"
          initialAppearance={{ preference: 'light', systemAppearance: 'light' }}
          services={services as never}
        />,
      );
      renderer.flush();

      // preview 模式直接渲染 fixture 页面，不调用 svn validateWorkingCopy
      expect(renderer.findByTestId('repository-screen')).toBeTruthy();
      expect(validateCalled).toBe(false);
    } finally {
      unmount();
    }
  });
});
