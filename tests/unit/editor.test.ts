import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { resolveEditorTargetPath } from '../../src/domain/editor';
import { openInVsCode } from '../../src/application/openInVsCode';
import type { PathOpener } from '../../src/services/platform/pathOpener';

describe('resolveEditorTargetPath', () => {
  test('returns working copy root if targetPath is empty or undefined', () => {
    expect(resolveEditorTargetPath({ rootPath: '/Users/dev/work/frontend' })).toBe('/Users/dev/work/frontend');
    expect(resolveEditorTargetPath({ rootPath: '/Users/dev/work/frontend', targetPath: '' })).toBe('/Users/dev/work/frontend');
    expect(resolveEditorTargetPath({ rootPath: '/Users/dev/work/frontend', targetPath: '   ' })).toBe('/Users/dev/work/frontend');
  });

  test('expands ~ in rootPath', () => {
    expect(resolveEditorTargetPath({ rootPath: '~/work/repo' })).toBe(join(homedir(), 'work/repo'));
    expect(resolveEditorTargetPath({ rootPath: '~/work/repo', targetPath: 'src/app.ts' })).toBe(
      join(homedir(), 'work/repo/src/app.ts'),
    );
  });

  test('joins relative targetPath with rootPath', () => {
    expect(
      resolveEditorTargetPath({
        rootPath: '/Users/dev/repo',
        targetPath: 'src/components/UserCard.vue',
      }),
    ).toBe('/Users/dev/repo/src/components/UserCard.vue');
  });

  test('retains already absolute path if within rootPath', () => {
    expect(
      resolveEditorTargetPath({
        rootPath: '/Users/dev/repo',
        targetPath: '/Users/dev/repo/src/main.ts',
      }),
    ).toBe('/Users/dev/repo/src/main.ts');
  });

  test('strips repository trunk prefix for SVN history changed paths', () => {
    expect(
      resolveEditorTargetPath({
        rootPath: '/Users/dev/work/frontend-web',
        targetPath: '/trunk/src/components/UserCard.vue',
        repositoryUrl: 'http://svn.internal/repo/trunk',
        repositoryRoot: 'http://svn.internal/repo',
      }),
    ).toBe('/Users/dev/work/frontend-web/src/components/UserCard.vue');
  });

  test('handles root checkout where repositoryUrl equals repositoryRoot', () => {
    expect(
      resolveEditorTargetPath({
        rootPath: '/Users/dev/work/repo',
        targetPath: '/trunk/src/components/UserCard.vue',
        repositoryUrl: 'http://svn.internal/repo',
        repositoryRoot: 'http://svn.internal/repo',
      }),
    ).toBe('/Users/dev/work/repo/trunk/src/components/UserCard.vue');
  });

  test('falls back to stripping leading slash if repo url does not match', () => {
    expect(
      resolveEditorTargetPath({
        rootPath: '/Users/dev/work/repo',
        targetPath: '/other/src/file.ts',
        repositoryUrl: 'http://svn.internal/repo/trunk',
        repositoryRoot: 'http://svn.internal/repo',
      }),
    ).toBe('/Users/dev/work/repo/other/src/file.ts');
  });
});

describe('openInVsCode application use case', () => {
  test('calls opener.openInVsCode with resolved target path', async () => {
    const opened: string[] = [];
    const mockOpener: PathOpener = {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode(path) {
        opened.push(path);
      },
    };

    await openInVsCode(mockOpener, {
      rootPath: '/Users/dev/repo',
      targetPath: 'src/main.ts',
    });

    expect(opened).toEqual(['/Users/dev/repo/src/main.ts']);
  });
});
