import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as UI from './.generated';
import { nativeExamples } from './examples';
function Gallery() {
  const [selected, setSelected] = useState<keyof typeof nativeExamples | null>(null);
  return (
    <UI.Screen>
      <UI.Text variant="heading">Anhedral Native UI</UI.Text>
      <UI.Text variant="muted">66 component adaptations · Expo SDK 57</UI.Text>
      {selected ? (
        <UI.Stack>
          <UI.Button accessibilityLabel="All components" onPress={() => setSelected(null)}>
            All components
          </UI.Button>
          <UI.Text variant="title">{selected}</UI.Text>
          <View key={selected} style={{ minHeight: 200 }}>
            {nativeExamples[selected]()}
          </View>
        </UI.Stack>
      ) : (
        <>
          <UI.ThemeSwitcher />
          <View>
            {Object.entries(nativeExamples).map(([id]) => (
              <UI.Button
                key={id}
                variant="ghost"
                accessibilityLabel={`Show ${id}`}
                onPress={() => setSelected(id as keyof typeof nativeExamples)}
              >
                {id}
              </UI.Button>
            ))}
          </View>
        </>
      )}
    </UI.Screen>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <UI.ThemeProvider>
        <Gallery />
      </UI.ThemeProvider>
    </SafeAreaProvider>
  );
}
