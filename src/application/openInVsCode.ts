import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { PathOpener } from '../services/platform/pathOpener';
import { buildSvnPegUrl, resolveEditorTargetPath } from '../domain/editor';

export interface RevisionSnapshotProvider {
  catRevision(rootPath: string, target: string, revision?: number, signal?: AbortSignal): Promise<string>;
}

export interface OpenInVsCodeInput {
  rootPath: string;
  targetPath?: string;
  repositoryUrl?: string;
  repositoryRoot?: string;
  revision?: number;
  action?: 'A' | 'M' | 'D' | 'R' | string;
  svn?: RevisionSnapshotProvider;
}

export async function openInVsCode(
  opener: PathOpener,
  input: OpenInVsCodeInput,
): Promise<string> {
  const localTarget = resolveEditorTargetPath({
    rootPath: input.rootPath,
    targetPath: input.targetPath,
    repositoryUrl: input.repositoryUrl,
    repositoryRoot: input.repositoryRoot,
  });

  if (!input.targetPath || !input.targetPath.trim()) {
    await opener.openInVsCode(localTarget);
    return localTarget;
  }

  // When viewing a historical revision in History view
  if (input.revision !== undefined) {
    // 1. If local file exists, open it directly
    if (existsSync(localTarget)) {
      await opener.openInVsCode(localTarget);
      return localTarget;
    }

    // 2. If file does not exist locally and revision context is provided, fetch snapshot
    if (input.svn) {
      const isDeleted = input.action === 'D';
      const targetRevision = isDeleted ? input.revision - 1 : input.revision;
      if (targetRevision <= 0) {
        throw new Error(`Cannot retrieve snapshot for deleted file at revision ${input.revision}`);
      }

      const pegTarget = buildSvnPegUrl(input.repositoryRoot, input.targetPath, targetRevision);
      const content = await input.svn.catRevision(input.rootPath, pegTarget, targetRevision);

      const safeRelPath = input.targetPath.replace(/^[/\\]+/, '');
      const snapshotPath = join(
        tmpdir(),
        'Revision',
        'snapshots',
        `r${targetRevision}`,
        safeRelPath,
      );

      await mkdir(dirname(snapshotPath), { recursive: true });
      await writeFile(snapshotPath, content, 'utf8');

      await opener.openInVsCode(snapshotPath);
      return snapshotPath;
    }

    throw new Error(`File does not exist: ${localTarget}`);
  }

  // Default / Changes view: directly open target in working copy
  await opener.openInVsCode(localTarget);
  return localTarget;
}
