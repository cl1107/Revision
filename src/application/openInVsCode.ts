import type { PathOpener } from '../services/platform/pathOpener';
import { resolveEditorTargetPath } from '../domain/editor';

export async function openInVsCode(
  opener: PathOpener,
  input: {
    rootPath: string;
    targetPath?: string;
    repositoryUrl?: string;
    repositoryRoot?: string;
  },
): Promise<void> {
  const target = resolveEditorTargetPath(input);
  await opener.openInVsCode(target);
}
