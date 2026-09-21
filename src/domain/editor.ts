import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolveAbsolutePath(path: string, home = homedir()): string {
  const trimmed = path.trim();
  if (trimmed === '~') return home;
  if (trimmed.startsWith('~/')) return join(home, trimmed.slice(2));
  return trimmed;
}

export function resolveEditorTargetPath(input: {
  rootPath: string;
  targetPath?: string;
  repositoryUrl?: string;
  repositoryRoot?: string;
}): string {
  const base = resolveAbsolutePath(input.rootPath);
  if (!input.targetPath || !input.targetPath.trim()) return base;

  const trimmed = input.targetPath.trim();
  // Already absolute path pointing inside or outside base
  if (trimmed.startsWith('/') && base && trimmed.startsWith(base)) {
    return trimmed;
  }

  // Handle SVN repository-relative log path, e.g. /trunk/src/components/UserCard.vue
  if (input.repositoryUrl && input.repositoryRoot && input.repositoryUrl.startsWith(input.repositoryRoot)) {
    const wcRel = input.repositoryUrl.slice(input.repositoryRoot.length).replace(/\/+$/, '');
    if (wcRel && trimmed.startsWith(wcRel)) {
      const remainder = trimmed.slice(wcRel.length).replace(/^\/+/, '');
      return join(base, remainder);
    }
  }

  // Relative path (or leading slash stripped)
  const cleanRelative = trimmed.replace(/^\/+/, '');
  return join(base, cleanRelative);
}
