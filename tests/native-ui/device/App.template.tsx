import React, { useState } from 'react';
import { View, FlatList, ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as UI from './.generated';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
/* REGISTRY_IMPORTS */
/* REGISTRY_STORIES */
class Boundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <Text accessibilityRole="alert">{this.state.error}</Text>
    ) : (
      this.props.children
    );
  }
}
function Gallery() {
  const [index, setIndex] = useState<number | null>(null),
    [query, setQuery] = useState('');
  const active = index === null ? null : stories[index];
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8 }}>
        <UI.Text variant="heading">Registry QA</UI.Text>
        <UI.ThemeSwitcher />
        {active ? (
          <>
            <UI.Button onPress={() => setIndex(null)}>All examples</UI.Button>
            <UI.Text>{active.id}</UI.Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <UI.Button disabled={index === 0} onPress={() => setIndex(index! - 1)}>
                Previous example
              </UI.Button>
              <UI.Button
                disabled={index === stories.length - 1}
                onPress={() => setIndex(index! + 1)}
              >
                Next example
              </UI.Button>
            </View>
          </>
        ) : (
          <UI.Input
            accessibilityLabel="Find an example"
            placeholder="Search examples"
            value={query}
            onChangeText={setQuery}
          />
        )}
      </View>
      {active ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <NativeExampleOptions style="nova">
            <Boundary key={active.id}>
              <active.Component />
            </Boundary>
          </NativeExampleOptions>
        </ScrollView>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={stories.filter((story) => story.id.includes(query))}
          keyExtractor={(story) => story.id}
          renderItem={({ item }) => (
            <UI.Button
              variant="ghost"
              accessibilityLabel={'Open ' + item.id}
              onPress={() => setIndex(stories.indexOf(item))}
            >
              {item.id}
            </UI.Button>
          )}
        />
      )}
    </SafeAreaView>
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
