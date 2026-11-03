import { Icon, type IconName } from '../app/icons';
import { useTheme } from '../app/ThemeContext';
import { font } from '../app/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeStyle: Record<
  ButtonSize,
  { height: number; padding: number; fontSize: number; iconSize: number }
> = {
  xs: { height: 26, padding: 8, fontSize: 11, iconSize: 12 },
  sm: { height: 34, padding: 12, fontSize: 12, iconSize: 13 },
  md: { height: 36, padding: 14, fontSize: 13, iconSize: 14 },
  lg: { height: 42, padding: 12, fontSize: 13, iconSize: 15 },
};

export function Button({
  label,
  icon,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  grow,
  testId,
}: {
  label: string;
  icon?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  grow?: boolean;
  testId?: string;
}) {
  const theme = useTheme();
  const filled = variant === 'primary' || variant === 'danger';
  const metrics = sizeStyle[size];
  const backgroundColor = variant === 'danger' ? theme.danger : variant === 'primary' ? theme.accent : theme.panel;
  const hoverColor =
    variant === 'danger' ? theme.dangerHover : variant === 'primary' ? theme.accentHover : theme.panelHover;
  const contentColor = filled ? theme.accentText : theme.text;

  return (
    <div
      testId={testId}
      onClick={disabled ? undefined : onClick}
      style={{
        height: metrics.height,
        paddingLeft: metrics.padding,
        paddingRight: metrics.padding,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexGrow: grow ? 1 : undefined,
        width: grow ? '100%' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        backgroundColor,
        borderWidth: filled ? 0 : 1,
        borderColor: theme.border,
        hover: disabled ? undefined : { backgroundColor: hoverColor },
      }}
    >
      {icon ? <Icon name={icon} size={metrics.iconSize} color={contentColor} /> : null}
      <text
        style={{
          color: contentColor,
          fontSize: metrics.fontSize,
          fontFamily: font.ui,
        }}
      >
        {label}
      </text>
    </div>
  );
}
