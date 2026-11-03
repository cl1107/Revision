export const MAX_DIFF_CHARS = 60000;

export const CONVENTIONAL_COMMIT_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?: .+/;

export function buildAgyCommitPrompt(diff: string, source = 'working copy'): string {
  return [
    'You are a git commit-message writer. Based on the git diff below (',
    `source: ${source} changes), write ONE commit message that strictly follows the Conventional Commits 1.0.0 specification.`,
    '',
    'Rules:',
    '- First line format: <type>(<optional scope>)<!>: <subject>, where type is one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.',
    '- Subject and body: write in Chinese (Simplified); keep the type keywords (feat, fix, ...) and the Conventional Commits format in English.',
    '- Subject: no trailing period, keep the whole first line within 50 chars.',
    '- If the change breaks compatibility, add "!" after the type/scope and a "BREAKING CHANGE:" footer.',
    '- If the change is small or touches a single concern, output the first line ONLY, no body.',
    '- Otherwise add a body after one blank line: at most 5 bullets, each a single concise line (<= 50 chars), focusing on why the change was made (why > what).',
    '- Reply with ONLY the commit message text. No quotes, no markdown code fences, no explanation, no diff echo.',
    '',
    `GIT DIFF (${source}):`,
    diff,
  ].join('\n');
}

export function cleanCommitMessage(raw: string): string {
  let msg = raw.replace(/```[a-zA-Z]*\n?/g, ''); // strip markdown fences
  msg = msg.trim();
  const wrapped = msg.match(/^"([\s\S]*)"$/); // strip one pair of surrounding quotes
  if (wrapped) {
    msg = wrapped[1].trim();
  }
  return msg;
}

export function truncateDiff(diff: string, maxChars = MAX_DIFF_CHARS): string {
  if (diff.length <= maxChars) return diff;
  return diff.slice(0, maxChars) + '\n... (diff truncated)';
}

export function isConventionalCommit(message: string): boolean {
  const firstLine = message.trim().split('\n')[0] ?? '';
  return CONVENTIONAL_COMMIT_RE.test(firstLine);
}
