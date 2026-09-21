import { Button } from './Button';

export const OPEN_WITH_VSCODE_LABEL = 'Open with VS Code';

export function OpenInVsCodeButton({
  onClick,
  disabled,
  size = 'sm',
  testId,
}: {
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  testId?: string;
}) {
  return (
    <Button
      label={OPEN_WITH_VSCODE_LABEL}
      variant="secondary"
      size={size}
      disabled={disabled}
      onClick={onClick}
      testId={testId}
    />
  );
}
