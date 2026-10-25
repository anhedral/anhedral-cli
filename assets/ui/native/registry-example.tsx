import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { nativeRegistryIcons } from './registry-icons';
import { useTheme } from '../theme';
import { LabelText, content } from './_core';
import { RegistryView } from './registry-styles';

import { useNativeExampleStyle } from './_registry-context';
export { NativeExampleOptions, type NativeExampleStyle } from './_registry-context';
/** Browser gallery search parameters become explicit native preview context. */
export function useDesignSystemSearchParams() {
  return [{ style: useNativeExampleStyle() }] as const;
}
export function ExampleWrapper({ children, style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[{ width: '100%', backgroundColor: colors.background, gap: 32, padding: 16 }, style]}
    >
      {content(children)}
    </View>
  );
}
export function Example({
  title,
  children,
  containerClassName,
  className,
  ...props
}: ViewProps & { title?: string; containerClassName?: string; className?: string }) {
  const { colors, radius } = useTheme(),
    preset = useNativeExampleStyle();
  return (
    <RegistryView
      {...props}
      className={containerClassName}
      style={[{ width: '100%', gap: 4 }, props.style]}
    >
      {title && (
        <LabelText
          accessibilityRole="header"
          style={{
            paddingHorizontal: 6,
            paddingVertical: 8,
            fontSize: 12,
            color: colors['muted-foreground'],
            fontWeight: '500',
          }}
        >
          {title}
        </LabelText>
      )}
      <RegistryView
        className={className}
        style={{
          gap: 24,
          padding: 24,
          backgroundColor: colors.card,
          borderRadius: preset === 'lyra' || preset === 'sera' ? 0 : radius + 4,
        }}
      >
        {children}
      </RegistryView>
    </RegistryView>
  );
}
/** Native recipes use the official Lucide icon; browser icon-package pickers stay in the web gallery. */
export function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: {
  lucide: keyof typeof nativeRegistryIcons;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
} & React.ComponentProps<(typeof nativeRegistryIcons)[keyof typeof nativeRegistryIcons]>) {
  const Icon = nativeRegistryIcons[lucide];
  if (!Icon) throw Error('Unreviewed native registry icon: ' + lucide);
  return <Icon {...props} />;
}
