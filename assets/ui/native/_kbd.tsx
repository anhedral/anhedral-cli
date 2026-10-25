import { useContext, type Ref } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type ViewProps,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { useTheme } from '../theme';
import { useNativeFontStyle } from './fonts';
import {
  NativeTextStyleProvider,
  NativeTextStyleContext,
  TextToneProvider,
  content,
  useTextTone,
} from './_core';
import {
  useNativeComponentStyle,
  useNativeRegistrySource,
  useRegistryPalette,
  NativeButtonIconSize,
} from './_registry-context';
import { NativeKbdSurfaceContext } from './_kbd-context';
import { nativePresetKbdStyle } from './_preset-kbd-style';
import {
  NativeInputGroupKbdPaint,
  NativeInputGroupHostBoundary,
  useNativeInputGroupAddonPresence,
} from './_input-group-context';
const textKeys = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'includeFontPadding',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textAlignVertical',
  'textDecorationColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'writingDirection',
  'verticalAlign',
  'userSelect',
]);
export type KbdProps = Omit<ViewProps, 'style'> & { style?: StyleProp<TextStyle>; ref?: Ref<View> };
function NativeKbd({ part, children, style, ...props }: KbdProps & { part: 'Kbd' | 'KbdGroup' }) {
  useNativeInputGroupAddonPresence('kbd', part === 'Kbd');
  const addonPaint = useContext(NativeInputGroupKbdPaint);
  const theme = useTheme(),
    requested = useNativeComponentStyle(),
    origin = useNativeRegistrySource(),
    generation = useRegistryPalette(),
    surface = useContext(NativeKbdSurfaceContext),
    inherited = useContext(NativeTextStyleContext),
    inheritedTone = useTextTone(),
    inheritedIconSize = useContext(NativeButtonIconSize),
    { fontScale } = useWindowDimensions();
  const preset =
    origin === 'default' || origin === 'new-york' || origin === 'new-york-v4'
      ? origin
      : generation === 'legacy'
        ? 'default'
        : (requested ?? 'nova');
  const own = StyleSheet.flatten([
      part === 'Kbd' && addonPaint.descendant,
      part === 'Kbd' && addonPaint.direct,
      style,
    ]),
    ownText = Object.fromEntries(
      Object.entries(own ?? {}).filter(([key]) => textKeys.has(key)),
    ) as TextStyle,
    ownView = Object.fromEntries(Object.entries(own ?? {}).filter(([key]) => !textKeys.has(key)));
  const adapted = nativePresetKbdStyle(preset, part, {
    ...theme,
    ...surface,
    fontScale,
    fontSize: own?.fontSize,
    lineHeight: own?.lineHeight,
  });
  const parent = StyleSheet.flatten(inherited.style),
    inheritedRatio =
      parent?.fontSize && parent.lineHeight ? parent.lineHeight / parent.fontSize : 1.5;
  const baseFont = adapted.text.fontSize ?? 14,
    requestedFont = own?.fontSize ?? baseFont;
  const sourceLine = adapted.inheritsLeading
    ? baseFont * inheritedRatio
    : (adapted.text.lineHeight ?? baseFont * 1.5);
  const requestedLine = own?.lineHeight ?? (sourceLine * requestedFont) / baseFont;
  const metrics = {
    ...adapted.text,
    ...(adapted.inheritsLeading || own?.fontSize !== undefined
      ? { fontSize: requestedFont, lineHeight: requestedLine }
      : undefined),
  };
  const inheritedHeight =
    adapted.inheritsLeading && typeof adapted.sourceHeight === 'number'
      ? Math.max(
          adapted.sourceHeight,
          requestedLine * fontScale + Math.max(0, adapted.sourceHeight - sourceLine),
        )
      : undefined;
  const face = useNativeFontStyle(
    adapted.fontRole ?? inherited.fontRole ?? 'sans',
    Number(ownText.fontWeight ?? metrics.fontWeight) || 400,
    (ownText.fontStyle ?? metrics.fontStyle) === 'italic',
  );
  return (
    <NativeTextStyleProvider
      value={{
        style: [
          inherited.style,
          metrics,
          adapted.fontRole && { fontFamily: undefined },
          adapted.fontRole && face,
          ownText,
        ],
        fontRole: adapted.fontRole ?? inherited.fontRole,
      }}
    >
      <TextToneProvider
        value={
          typeof ownText.color === 'string' ? ownText.color : (adapted.foreground ?? inheritedTone)
        }
      >
        <NativeButtonIconSize.Provider value={adapted.iconSize ?? inheritedIconSize}>
          <View
            {...props}
            pointerEvents={props.pointerEvents ?? (part === 'Kbd' ? 'none' : undefined)}
            style={[
              { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
              part === 'Kbd' && { justifyContent: 'center' },
              adapted.view,
              inheritedHeight !== undefined && { height: inheritedHeight },
              ownView,
            ]}
          >
            <NativeInputGroupHostBoundary>{content(children)}</NativeInputGroupHostBoundary>
          </View>
        </NativeButtonIconSize.Provider>
      </TextToneProvider>
    </NativeTextStyleProvider>
  );
}
export function Kbd(props: KbdProps) {
  return <NativeKbd {...props} part="Kbd" />;
}
export function KbdGroup(props: KbdProps) {
  return <NativeKbd {...props} part="KbdGroup" />;
}
Object.assign(Kbd, { nativeTextSlot: true });
Object.assign(KbdGroup, { nativeTextSlot: true });
