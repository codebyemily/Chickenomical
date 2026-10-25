import { Link, type Href } from 'expo-router';
import { forwardRef, isValidElement, type ComponentRef, type ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

type Props = PressableProps & { href: Href; push?: boolean; replace?: boolean };
type LinkTargetProps = PressableProps & { pressableStyle?: PressableProps['style'] };
type TextElementProps = {
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: string;
  children?: ReactNode;
};

const LinkTarget = forwardRef<ComponentRef<typeof Pressable>, LinkTargetProps>(function LinkTarget({ pressableStyle, style, ...props }, ref) {
  const label = props.accessibilityLabel ?? (typeof props.children === 'function' ? undefined : getVisibleText(props.children));
  return (
    <Pressable
      {...props}
      ref={ref}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={(state) => [
        typeof pressableStyle === 'function' ? pressableStyle(state) : pressableStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
    />
  );
});

function getVisibleText(children: ReactNode): string | undefined {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getVisibleText).filter(Boolean).join(' ').trim() || undefined;
  if (!isValidElement<TextElementProps>(children)) return undefined;
  if (children.props.accessibilityElementsHidden || children.props.importantForAccessibility === 'no-hide-descendants') return undefined;
  return getVisibleText(children.props.children);
}

export function LinkPressable({ href, push, replace, style, ...props }: Props) {
  return (
    <Link href={href} push={push ?? !replace} replace={replace} asChild>
      {/* Slot merges its style prop as an object; keep Pressable callbacks outside that merge. */}
      <LinkTarget accessibilityRole="link" {...props} pressableStyle={style} />
    </Link>
  );
}
