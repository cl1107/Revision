import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { ChangesPanel } from '../../src/features/changes/ChangesPanel';
import type { WorkingCopyChange } from '../../src/domain/change';
import { RepositoryStoreProvider } from '../../src/store/RepositoryStoreContext';
import { createRepositoryStore } from '../../src/store/repositoryStore';

const changes: WorkingCopyChange[] = [
  { path: 'src/a.ts', absolutePath: '/tmp/wc/src/a.ts', status: 'modified' },
  { path: 'scratch.txt', absolutePath: '/tmp/wc/scratch.txt', status: 'unversioned' },
];

function PanelHarness() {
  const store = createRepositoryStore({
    changes,
    checkedPaths: ['src/a.ts'],
    selectedPath: 'src/a.ts',
    commitMessage: 'msg',
  });
  return (
    <RepositoryStoreProvider store={store}>
      <ChangesPanel onCommit={() => {}} onRefresh={() => {}} />
    </RepositoryStoreProvider>
  );
}

import { getBoundsDimensions, simulateClick } from '../helpers';

describe('ChangesPanel', () => {
  test('checkbox 与 row select 分离', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      render(<PanelHarness />);
      renderer.flush();
      expect(renderer.getAllText()).toContain('1 selected');
      simulateClick(renderer, 'check-scratch.txt');
      renderer.flush();
      expect(renderer.getAllText()).toContain('2 selected');
      expect(renderer.getAllText()).toContain('src/a.ts');
    } finally {
      unmount();
    }
  });

  test('文件行拉满 Changes pane 宽度，不贴着文字收缩', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 396, height: 960 });
    try {
      render(<PanelHarness />);
      renderer.flush();
      const panel = renderer.findByTestId('changes-panel');
      const row = renderer.findByTestId('change-src/a.ts');
      expect(panel).toBeTruthy();
      expect(row).toBeTruthy();
      const panelBounds = renderer.getElementBounds(panel!.id);
      const rowBounds = renderer.getElementBounds(row!.id);
      expect(panelBounds).toBeTruthy();
      expect(rowBounds).toBeTruthy();
      if (!panelBounds || !rowBounds) return;
      const { width: panelWidth } = getBoundsDimensions(panelBounds);
      const { x: rowX, width: rowWidth } = getBoundsDimensions(rowBounds);
      expect(rowWidth).toBeGreaterThan(360);
      expect(rowWidth).toBeGreaterThan(panelWidth - 24);
      expect(rowX).toBeGreaterThanOrEqual(0);
      expect(rowX).toBeLessThan(16);
    } finally {
      unmount();
    }
  });
});
