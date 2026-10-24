import { Link, type Href } from 'expo-router';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, type PressableProps } from 'react-native';

type Props = PressableProps & { href: Href; push?: boolean; replace?: boolean };
type LinkTargetProps = PressableProps & { pressableStyle?: PressableProps['style'] };

const LinkTarget = forwardRef<ComponentRef<typeof Pressable>, LinkTargetProps>(function LinkTarget({ pressableStyle, style, ...props }, ref) {
  return (
    <Pressable
      {...props}
      ref={ref}
      style={(state) => [
        typeof pressableStyle === 'function' ? pressableStyle(state) : pressableStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
    />
  );
});

export function LinkPressable({ href, push, replace, style, ...props }: Props) {
  return (
    <Link href={href} push={push ?? !replace} replace={replace} asChild>
      {/* Slot merges its style prop as an object; keep Pressable callbacks outside that merge. */}
      <LinkTarget accessibilityRole="link" {...props} pressableStyle={style} />
    </Link>
  );
}
