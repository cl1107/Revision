import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { RepositoryScreen } from '../../src/features/repository/RepositoryScreen';
import type { Repository } from '../../src/domain/repository';
import type { RecentItem } from '../../src/features/welcome/WelcomeScreen';

const repo: Repository = {
  rootPath: '/tmp/demo-wc',
  repositoryUrl: 'file:///repo',
  repositoryRoot: 'file:///repo',
  revision: 4,
};

const recents: RecentItem[] = [
  {
    name: 'demo-wc',
    path: '~/demo-wc',
    absolutePath: '/tmp/demo-wc',
    statusLabel: 'Working copy',
    statusTone: 'ok',
  },
  {
    name: 'other-wc',
    path: '~/other-wc',
    absolutePath: '/tmp/other-wc',
    statusLabel: 'Working copy',
    statusTone: 'ok',
  },
];

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('timed out');
}

import { simulateClick as click } from '../helpers';

describe('Workspace switcher', () => {
  test('可切换 recent working copy', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 1440, height: 960 });
    try {
      const switched: string[] = [];
      render(
        <RepositoryScreen
          repository={repo}
          workingCopyName="demo-wc"
          workingCopyPath="~/demo-wc"
          recents={recents}
          onSwitchWorkingCopy={(path) => switched.push(path)}
          svn={{
            async validateWorkingCopy() {
              return repo;
            },
            async getStatus() {
              return [];
            },
            async getDiff() {
              return { kind: 'text', patch: '' };
            },
          }}
        />,
      );
      renderer.flush();
      await waitFor(() => Boolean(renderer.findByTestId('workspace-switcher')));
      click(renderer, 'workspace-switcher');
      renderer.flush();
      expect(renderer.findByTestId('workspace-menu')).toBeTruthy();
      expect(renderer.findByTestId('titlebar-welcome')).toBeUndefined();
      expect(renderer.findByTestId('close-working-copy')).toBeUndefined();
      expect(renderer.getAllText()).toContain('other-wc');
      click(renderer, 'workspace-recent-other-wc');
      renderer.flush();
      expect(switched).toEqual(['/tmp/other-wc']);
    } finally {
      unmount();
    }
  });

});
