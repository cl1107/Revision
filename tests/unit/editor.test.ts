import { describe, expect, test } from 'bun:test';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { buildSvnPegUrl, resolveEditorTargetPath } from '../../src/domain/editor';
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

describe('buildSvnPegUrl', () => {
  test('handles repositoryRoot prefix', () => {
    expect(
      buildSvnPegUrl('https://svn.example.com/repos/proj', '/trunk/src/index.ts', 123),
    ).toBe('https://svn.example.com/repos/proj/trunk/src/index.ts@123');
  });

  test('handles already complete url', () => {
    expect(
      buildSvnPegUrl(undefined, 'https://svn.example.com/repos/proj/trunk/src/index.ts', 123),
    ).toBe('https://svn.example.com/repos/proj/trunk/src/index.ts@123');
  });

  test('falls back to relative caret url when repositoryRoot is missing', () => {
    expect(buildSvnPegUrl(undefined, '/trunk/src/index.ts', 123)).toBe('^/trunk/src/index.ts@123');
    expect(buildSvnPegUrl(undefined, 'trunk/src/index.ts', 123)).toBe('^/trunk/src/index.ts@123');
  });
});

describe('openInVsCode application use case', () => {
  test('calls opener.openInVsCode with root directory if targetPath is not provided', async () => {
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
    });

    expect(opened).toEqual(['/Users/dev/repo']);
  });

  test('opens local file when it exists on disk', async () => {
    const testDir = join(tmpdir(), `test-wc-${Date.now()}`);
    mkdirSync(join(testDir, 'src'), { recursive: true });
    const localFile = join(testDir, 'src/main.ts');
    writeFileSync(localFile, 'console.log("hello");', 'utf8');

    const opened: string[] = [];
    const mockOpener: PathOpener = {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode(path) {
        opened.push(path);
      },
    };

    await openInVsCode(mockOpener, {
      rootPath: testDir,
      targetPath: 'src/main.ts',
    });

    expect(opened).toEqual([localFile]);
    rmSync(testDir, { recursive: true, force: true });
  });

  test('falls back to svn cat snapshot when file does not exist locally', async () => {
    const testDir = join(tmpdir(), `test-wc-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const opened: string[] = [];
    const mockOpener: PathOpener = {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode(path) {
        opened.push(path);
      },
    };

    let catTarget = '';
    let catRev: number | undefined;
    const mockSvn = {
      async catRevision(rootPath: string, target: string, rev?: number) {
        catTarget = target;
        catRev = rev;
        return 'CREATE TABLE test_table;';
      },
    };

    const targetSnapshot = await openInVsCode(mockOpener, {
      rootPath: testDir,
      targetPath: '/secu/gxzq/datascript/test.sql',
      repositoryUrl: 'https://svn.internal/repos/secu/gxzq',
      repositoryRoot: 'https://svn.internal/repos',
      revision: 1689,
      action: 'A',
      svn: mockSvn,
    });

    expect(catTarget).toBe('https://svn.internal/repos/secu/gxzq/datascript/test.sql@1689');
    expect(catRev).toBe(1689);
    expect(opened).toEqual([targetSnapshot]);
    expect(readFileSync(targetSnapshot, 'utf8')).toBe('CREATE TABLE test_table;');

    rmSync(testDir, { recursive: true, force: true });
    rmSync(targetSnapshot, { force: true });
  });

  test('requests rev - 1 snapshot for deleted file (Action: D)', async () => {
    const testDir = join(tmpdir(), `test-wc-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const opened: string[] = [];
    const mockOpener: PathOpener = {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode(path) {
        opened.push(path);
      },
    };

    let catRev: number | undefined;
    const mockSvn = {
      async catRevision(_root: string, _target: string, rev?: number) {
        catRev = rev;
        return 'previous content';
      },
    };

    await openInVsCode(mockOpener, {
      rootPath: testDir,
      targetPath: 'deleted.txt',
      revision: 100,
      action: 'D',
      svn: mockSvn,
    });

    expect(catRev).toBe(99);
    rmSync(testDir, { recursive: true, force: true });
  });

  test('throws when file does not exist locally and no snapshot service provided', async () => {
    const mockOpener: PathOpener = {
      async openPath() {},
      async revealPaths() {},
      async openInVsCode() {},
    };

    expect(
      openInVsCode(mockOpener, {
        rootPath: '/non/existent/path',
        targetPath: 'missing.ts',
        revision: 123,
      }),
    ).rejects.toThrow('File does not exist: /non/existent/path/missing.ts');
  });
});
