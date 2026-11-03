import { describe, expect, test } from 'bun:test';
import { createTestRoot, hasNativeTestRenderer } from '@gpuix/react/testing';
import { SettingsDialog } from '../../src/features/settings/SettingsDialog';
import { simulateClick as click } from '../helpers';
import type { AiClient } from '../../src/services/ai/openaiClient';

describe('SettingsDialog', () => {
  test('渲染设置项并支持获取模型与保存', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 800, height: 600 });
    try {
      let savedConfig: any = null;
      let cancelled = false;

      const mockAiClient: AiClient = {
        async listModels() {
          return ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet'];
        },
        async generateCommitMessage() {
          return 'feat: dummy';
        },
      };

      render(
        <SettingsDialog
          initialSettings={{
            endpoint: 'https://api.openai.com/v1',
            apiKey: 'sk-test',
            model: 'gpt-4o',
          }}
          aiClient={mockAiClient}
          onSave={(cfg) => {
            savedConfig = cfg;
          }}
          onCancel={() => {
            cancelled = true;
          }}
        />,
      );
      renderer.flush();

      expect(renderer.getAllText()).toContain('AI Commit 设置');

      // Click fetch models
      click(renderer, 'settings-fetch-models');
      await Bun.sleep(50);
      renderer.flush();

      expect(renderer.getAllText()).toContain('gpt-4o-mini');

      // Click on model option
      click(renderer, 'model-option-gpt-4o-mini');
      renderer.flush();

      // Click Save
      click(renderer, 'settings-save');
      renderer.flush();

      expect(savedConfig).toEqual({
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
      });
      expect(cancelled).toBe(false);
    } finally {
      unmount();
    }
  });

  test('点击取消触发 onCancel', () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 800, height: 600 });
    try {
      let cancelled = false;
      render(
        <SettingsDialog
          onSave={() => {}}
          onCancel={() => {
            cancelled = true;
          }}
        />,
      );
      renderer.flush();
      click(renderer, 'settings-cancel');
      expect(cancelled).toBe(true);
    } finally {
      unmount();
    }
  });

  test('支持获取大量模型并可完整显示和选择', async () => {
    if (!hasNativeTestRenderer) return;
    const { render, renderer, unmount } = createTestRoot({ width: 800, height: 600 });
    try {
      const mockModels = Array.from({ length: 30 }, (_, i) => `model-option-${i}`);
      const mockAiClient: AiClient = {
        async listModels() {
          return mockModels;
        },
        async generateCommitMessage() {
          return '';
        },
      };

      let savedModel = '';
      render(
        <SettingsDialog
          aiClient={mockAiClient}
          onSave={(cfg) => {
            savedModel = cfg.model || '';
          }}
          onCancel={() => {}}
        />,
      );
      renderer.flush();

      click(renderer, 'settings-fetch-models');
      await Bun.sleep(50);
      renderer.flush();

      // Ensure model beyond index 16 exists
      const target = renderer.findByTestId('model-option-model-option-25');
      expect(Boolean(target)).toBe(true);

      if (target) {
        renderer.scrollIntoView(target.id);
        renderer.flush();
      }

      click(renderer, 'model-option-model-option-25');
      renderer.flush();

      click(renderer, 'settings-save');
      renderer.flush();

      expect(savedModel).toBe('model-option-25');
    } finally {
      unmount();
    }
  });
});
