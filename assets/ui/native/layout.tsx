import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, type ReactNode } from 'react';
import { NativeNavigationProvider, useNativeNavigation } from './navigation';
import { useTheme } from '../theme';
export function Stack({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ gap: 12 }, style]} />;
}
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const navigation = useNativeNavigation();
  const { colors } = useTheme();
  return (
    <NativeNavigationProvider
      onAnchor={async (anchor, options) => {
        if (navigation.onAnchor) return navigation.onAnchor(anchor, options);
        if (anchor) throw Error('This native screen has no handler for anchor: ' + anchor);
        if (options.scroll !== false) scroll.current?.scrollTo({ y: 0, animated: true });
      }}
    >
      <ScrollView
        ref={scroll}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 }}>
          {children}
        </View>
      </ScrollView>
    </NativeNavigationProvider>
  );
}
