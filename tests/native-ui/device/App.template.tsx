import React, { useState } from 'react';
import { View, FlatList, ScrollView, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as UI from './.generated';
import { RegistryView } from './.generated/src/native/registry-styles';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
/* REGISTRY_IMPORTS */
/* REGISTRY_STORIES */
function NativeButtonPresetMatrix() {
  const [selected, setSelected] = useState('none');
  return (
    <View style={{ gap: 8 }}>
      {(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const).map((style) => (
        <UI.NativeComponentStyleProvider key={style} style={style}>
          <UI.Button
            accessibilityLabel={'Native preset ' + style}
            onPress={() => setSelected(style)}
          >
            {style}
          </UI.Button>
        </UI.NativeComponentStyleProvider>
      ))}
      <UI.Text>{'Selected preset: ' + selected}</UI.Text>
    </View>
  );
}
function NativeNavigationMatrix() {
  const [route, setRoute] = useState('none'),
    [anchor, setAnchor] = useState('none');
  return (
    <UI.NativeNavigationProvider
      onNavigate={(href) => setRoute(href)}
      onAnchor={(anchor) => setAnchor(anchor)}
    >
      <View style={{ gap: 24 }}>
        <UI.Text>
          Read{' '}
          <UI.NativeLink href="/native" accessibilityLabel="Inline native route">
            the native route
          </UI.NativeLink>{' '}
          inline.
        </UI.Text>
        <UI.Button asChild>
          <UI.NativeLink href="/login" accessibilityLabel="Composed native route">
            Login
          </UI.NativeLink>
        </UI.Button>
        <UI.NativeLink href="#section" accessibilityLabel="Native section anchor">
          Jump to section
        </UI.NativeLink>
        <UI.Text>{'Visited route: ' + route}</UI.Text>
        <UI.Text>{'Visited anchor: ' + anchor}</UI.Text>
      </View>
    </UI.NativeNavigationProvider>
  );
}
function NativeRenderHostMatrix() {
  const [host, setHost] = useState('none'),
    [count, setCount] = useState(0);
  const markHost = (value: string) => {
    setHost(value);
    setCount((count) => count + 1);
  };
  return (
    <UI.NativeComponentStyleProvider style="nova">
      <View style={{ gap: 24 }}>
        <UI.Button render={<RegistryView />} onPress={() => markHost('view')}>
          Registry view action
        </UI.Button>
        <UI.Badge onPress={() => markHost('text')} render={(props) => <UI.Text {...props} />}>
          Text badge action
        </UI.Badge>
        <RegistryView onPress={() => markHost('registry')} className="p-2 border">
          Registry click action
        </RegistryView>
        <UI.Text>{'Host action: ' + host}</UI.Text>
        <UI.Text>{'Host count: ' + count}</UI.Text>
      </View>
    </UI.NativeComponentStyleProvider>
  );
}
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
