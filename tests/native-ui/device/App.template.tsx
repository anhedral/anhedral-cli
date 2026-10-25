import React, { useState } from 'react';
import { View, FlatList, ScrollView, Text, type LayoutChangeEvent } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as UI from './.generated';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { withRegistryStyles, RegistryView } from './.generated/src/native/registry-styles';
import { NativeExampleOptions } from './.generated/src/native/registry-example';
/* REGISTRY_IMPORTS */
/* REGISTRY_STORIES */
const SourceCallbackButton = withRegistryStyles(UI.Button, 'button');
function NativeButtonCallbackMatrix() {
  const [plan, setPlan] = useState('one'),
    [views, setViews] = useState(0),
    [texts, setTexts] = useState(0),
    [submits, setSubmits] = useState(0),
    [pending, setPending] = useState(false);
  return (
    <NativeRegistryPalette source="radix" generation="modern">
      <UI.NativeForm onSubmit={() => setSubmits((n) => n + 1)} style={{ gap: 12 }}>
        <UI.Text>{'Callback submits: ' + submits}</UI.Text>
        <UI.Text>{'Callback view count: ' + views}</UI.Text>
        <UI.Text>{'Callback text count: ' + texts}</UI.Text>
        <UI.Text>{'Callback selected plan: ' + plan}</UI.Text>
        <UI.Select value={plan} onValueChange={(value) => setPlan(String(value))}>
          <UI.SelectTrigger asChild>
            <SourceCallbackButton accessibilityLabel="Open composed callback select">
              Choose plan
            </SourceCallbackButton>
          </UI.SelectTrigger>
          <UI.SelectContent>
            <UI.SelectItem value="one">Personal callback plan</UI.SelectItem>
            <UI.SelectItem value="two">Team callback plan</UI.SelectItem>
          </UI.SelectContent>
        </UI.Select>
        <SourceCallbackButton
          type="button"
          accessibilityLabel="Callback view action"
          onPress={() => setViews((n) => n + 1)}
          render={(props) => <View {...props} />}
        >
          View callback
        </SourceCallbackButton>
        <SourceCallbackButton
          type="button"
          accessibilityLabel="Callback text action"
          onPress={() => setTexts((n) => n + 1)}
          render={(props) => <Text {...props} />}
        >
          Text callback
        </SourceCallbackButton>
        <SourceCallbackButton type="submit">Submit callback form</SourceCallbackButton>
        <UI.Button type="button" onPress={() => setPending(true)}>
          Begin callback pending
        </UI.Button>
        <UI.Button pending={pending}>
          {(state) => (state.isPending ? 'Callback pending' : 'Callback ready')}
        </UI.Button>
      </UI.NativeForm>
    </NativeRegistryPalette>
  );
}
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
function NativeLayoutMatrix() {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const measure = (name: string) => (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = Math.round(width) + 'x' + Math.round(height);
    setMetrics((previous) => (previous[name] === next ? previous : { ...previous, [name]: next }));
  };
  return (
    <UI.NativeComponentStyleProvider style="nova">
      <View style={{ gap: 12 }}>
        <View style={{ width: 160, gap: 12 }}>
          <UI.AspectRatio ratio={2} onLayout={measure('Ratio')} style={{ backgroundColor: '#ddd' }}>
            <UI.Text>Aspect 2:1</UI.Text>
          </UI.AspectRatio>
          <UI.Separator decorative={false} onLayout={measure('Horizontal')} />
          <View
            style={{ width: 160, height: 80, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <UI.Text>Before</UI.Text>
            <UI.Separator
              orientation="vertical"
              decorative={false}
              onLayout={measure('Vertical')}
            />
            <UI.Text>After</UI.Text>
          </View>
          <UI.Skeleton style={{ width: 100, height: 20 }} onLayout={measure('Skeleton')} />
        </View>
        {['Ratio', 'Horizontal', 'Vertical', 'Skeleton'].map((name) => (
          <UI.Text key={name}>{name + ' geometry: ' + (metrics[name] ?? 'pending')}</UI.Text>
        ))}
      </View>
    </UI.NativeComponentStyleProvider>
  );
}
function NativeCardMatrix() {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const measure = (name: string) => (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const next = Math.round(width) + 'x' + Math.round(height);
    setMetrics((previous) => (previous[name] === next ? previous : { ...previous, [name]: next }));
  };
  return (
    <View style={{ gap: 12 }}>
      {(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const).flatMap(
        (style) =>
          (['default', 'sm'] as const).map((size) => {
            const name = style + ' ' + size;
            return (
              <UI.NativeComponentStyleProvider key={name} style={style}>
                <UI.Card size={size} style={{ width: 160 }} onLayout={measure(name)}>
                  <UI.CardContent>
                    <View style={{ height: 20 }} />
                  </UI.CardContent>
                </UI.Card>
                <UI.Text>{'Card ' + name + ' geometry: ' + (metrics[name] ?? 'pending')}</UI.Text>
              </UI.NativeComponentStyleProvider>
            );
          }),
      )}
      <UI.NativeComponentStyleProvider style="nova">
        <UI.Card style={{ width: 160 }} onLayout={measure('footer')}>
          <UI.CardContent>
            <View style={{ height: 20 }} />
          </UI.CardContent>
          <UI.CardFooter>
            <View style={{ height: 20 }} />
          </UI.CardFooter>
        </UI.Card>
        <UI.Text>{'Card footer geometry: ' + (metrics.footer ?? 'pending')}</UI.Text>
      </UI.NativeComponentStyleProvider>
    </View>
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
          testID="registry-story-scroll"
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
