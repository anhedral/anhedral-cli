import { ScrollView, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { useTheme } from '../theme';
export function Stack({ style, ...props }: ViewProps) {
  return <View {...props} style={[{ gap: 12 }, style]} />;
}
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <ScrollView
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
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 }}>{children}</View>
    </ScrollView>
  );
}
