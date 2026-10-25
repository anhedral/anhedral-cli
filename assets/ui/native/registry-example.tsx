import { type ReactNode, type Ref } from 'react';
import {
  useWindowDimensions,
  type ViewProps,
  type View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { registryStyle } from './_registry-css';
import { nativeRegistryIcons } from './registry-icons';
import { LabelText, content } from './_core';
import { RegistryView, registryClassNames } from './registry-styles';

import { useNativeExampleStyle, NativeExampleChildWidth } from './_registry-context';
import { nativeExampleLayoutSource } from './_example-layout-source';
export { NativeExampleOptions, type NativeExampleStyle } from './_registry-context';
/** Browser gallery search parameters become explicit native preview context. */
export function useDesignSystemSearchParams() {
  return [{ style: useNativeExampleStyle() }] as const;
}
/** Source className belongs to the inner gallery grid, not the outer background. */
export function ExampleWrapper({
  children,
  className,
  style,
  ...props
}: ViewProps & { className?: string; ref?: Ref<View> }) {
  return (
    <RegistryView className={nativeExampleLayoutSource.slots.outer}>
      <RegistryView
        {...props}
        className={registryClassNames(nativeExampleLayoutSource.slots.wrapper, className)}
        style={style}
      >
        {content(children)}
      </RegistryView>
    </RegistryView>
  );
}
ExampleWrapper.nativeRegistryOwnClassName = true;
export function Example({
  title,
  children,
  containerClassName,
  className,
  style,
  contentStyle,
  ...props
}: ViewProps & {
  title?: string;
  containerClassName?: string;
  className?: string;
  ref?: Ref<View>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const preset = useNativeExampleStyle();
  const regular: string[] = [],
    conditional: string[] = [];
  for (const token of registryClassNames(nativeExampleLayoutSource.slots.content, className).split(
    /\s+/,
  )) {
    if (token.startsWith('*:')) continue;
    const match = /^style-(lyra|sera):(.+)$/.exec(token);
    if (match) {
      if (preset === match[1]) conditional.push(match[2]!);
    } else regular.push(token);
  }
  const contentClasses = [...regular, ...conditional].join(' ');
  const { width, height } = useWindowDimensions(),
    { mode } = useTheme();
  const basis = registryStyle(
    contentClasses
      .split(/\s+/)
      .filter((token) => /(?:^|:)basis-/.test(token))
      .join(' '),
    { width, height, mode, styleName: preset, radius: 0, color: () => '' },
  ).view.flexBasis;
  // Native flex columns need an intrinsic basis to reproduce CSS grid auto-row sizing in scroll views.
  const intrinsic = basis === undefined ? { flexBasis: 'auto' as const } : undefined;
  return (
    <RegistryView
      {...props}
      className={registryClassNames(nativeExampleLayoutSource.slots.example, containerClassName)}
      style={style}
    >
      {title && (
        <RegistryView className={nativeExampleLayoutSource.slots.title}>
          <LabelText accessibilityRole="header">{title}</LabelText>
        </RegistryView>
      )}
      <RegistryView className={contentClasses} style={[intrinsic, contentStyle]}>
        <NativeExampleChildWidth.Provider value>
          {content(children)}
        </NativeExampleChildWidth.Provider>
      </RegistryView>
    </RegistryView>
  );
}
Example.nativeRegistryOwnClassName = true;
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

IconPlaceholder.nativeRegistryIcon = true;
