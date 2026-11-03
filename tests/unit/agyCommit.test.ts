import { describe, expect, test } from 'bun:test';
import {
  buildAgyCommitPrompt,
  cleanCommitMessage,
  isConventionalCommit,
  truncateDiff,
} from '../../src/domain/agyCommit';

describe('agyCommit domain', () => {
  test('buildAgyCommitPrompt contains diff and format requirements', () => {
    const prompt = buildAgyCommitPrompt('diff text here', 'selected');
    expect(prompt).toContain('source: selected changes');
    expect(prompt).toContain('Conventional Commits 1.0.0');
    expect(prompt).toContain('diff text here');
  });

  test('cleanCommitMessage removes code fences and outer quotes', () => {
    expect(cleanCommitMessage('```\nfeat: test\n```')).toBe('feat: test');
    expect(cleanCommitMessage('```markdown\nfix: something\n```')).toBe('fix: something');
    expect(cleanCommitMessage('"feat: quoted"')).toBe('feat: quoted');
    expect(cleanCommitMessage('  chore: trim space  ')).toBe('chore: trim space');
  });

  test('truncateDiff truncates diff when exceeding limit', () => {
    const longDiff = 'a'.repeat(100);
    expect(truncateDiff(longDiff, 50)).toBe('a'.repeat(50) + '\n... (diff truncated)');
    expect(truncateDiff('short diff', 50)).toBe('short diff');
  });

  test('isConventionalCommit checks format correctly', () => {
    expect(isConventionalCommit('feat: 增加新功能')).toBe(true);
    expect(isConventionalCommit('fix(core): 修复问题\n\n- 详细说明')).toBe(true);
    expect(isConventionalCommit('feat!: 破坏性变更')).toBe(true);
    expect(isConventionalCommit('invalid commit message')).toBe(false);
  });
});
