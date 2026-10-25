import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, FlatList, ScrollView, Text, Keyboard, type LayoutChangeEvent } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as UI from './.generated';
import * as AriaSelect from './.generated/src/native/registry-aria-select';
import {
  RegistrySelectAutocomplete,
  useRegistrySelectFilter,
} from './.generated/src/native/_select';
import { NativeInputGroupContext } from './.generated/src/native/_input-group-context';
import { NativeRegistryPalette } from './.generated/src/native/_registry-context';
import { withRegistryStyles, RegistryView } from './.generated/src/native/registry-styles';
import { Textarea as SourceTextarea } from './.generated/src/native/registry-form-controls';
import {
  NativeExampleOptions,
  Example as SourceExample,
  ExampleWrapper as SourceExampleWrapper,
} from './.generated/src/native/registry-example';
/* REGISTRY_IMPORTS */
/* REGISTRY_STORIES */
function NativeSelectMatrix() {
  const presets = [
    'nova',
    'vega',
    'maia',
    'lyra',
    'mira',
    'luma',
    'sera',
    'rhea',
    'default',
    'new-york',
    'new-york-v4',
  ] as const;
  const [index, setIndex] = useState(0),
    [frame, setFrame] = useState(''),
    [fruit, setFruit] = useState('alpha'),
    [multi, setMulti] = useState<string[]>([]),
    [country, setCountry] = useState(''),
    [long, setLong] = useState('29'),
    [valueHeight, setValueHeight] = useState(0);
  const preset = presets[index]!,
    items = [
      { value: 'alpha', label: 'Multi Alpha' },
      { value: 'beta', label: 'Multi Beta' },
    ];
  const { contains } = useRegistrySelectFilter({ sensitivity: 'base' });
  return (
    <View style={{ width: 320, gap: 8 }}>
      <UI.Text>{'Select preset: ' + preset}</UI.Text>
      <UI.Text>{'Select geometry: ' + preset + ':' + frame}</UI.Text>
      <UI.Button onPress={() => setIndex((index + 1) % presets.length)}>
        Next select preset
      </UI.Button>
      <NativeRegistryPalette
        source={
          preset === 'default' || preset === 'new-york' || preset === 'new-york-v4'
            ? preset
            : 'base'
        }
        generation={preset === 'default' || preset === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={preset}>
          <UI.Field>
            <UI.Label controlID="native-fruit">Open fruit choices by label</UI.Label>
            <UI.Select
              key={preset}
              value={fruit}
              onValueChange={(value) => setFruit(String(value))}
              nativeID="native-fruit"
            >
              <UI.SelectTrigger
                accessibilityLabel="Pick a native fruit"
                style={{ width: 320 }}
                onLayout={({ nativeEvent: { layout } }) =>
                  setFrame(Math.round(layout.width) + 'x' + Math.round(layout.height))
                }
              >
                <UI.SelectValue />
              </UI.SelectTrigger>
              <UI.SelectContent>
                <UI.SelectGroup>
                  <UI.SelectItem value="alpha">Fruit Alpha</UI.SelectItem>
                  <UI.SelectItem value="beta">Fruit Beta</UI.SelectItem>
                  <UI.SelectItem value="blocked" disabled>
                    Fruit Blocked
                  </UI.SelectItem>
                </UI.SelectGroup>
              </UI.SelectContent>
            </UI.Select>
          </UI.Field>
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>
      <UI.Text>{'Selected native fruit: ' + fruit}</UI.Text>
      <AriaSelect.Select
        selectionMode="multiple"
        value={multi}
        onValueChange={(value) => setMulti(Array.isArray(value) ? value.map(String) : [])}
      >
        <AriaSelect.SelectTrigger
          accessibilityLabel="Pick multiple native fruits"
          style={{ width: 320 }}
        >
          <AriaSelect.SelectValue<(typeof items)[0]>
            onLayout={({ nativeEvent: { layout } }) => setValueHeight(Math.round(layout.height))}
          >
            {({ selectedItems }) =>
              selectedItems.length
                ? selectedItems.map((item) => item.label).join(', ')
                : 'Choose native fruits'
            }
          </AriaSelect.SelectValue>
        </AriaSelect.SelectTrigger>
        <AriaSelect.SelectContent>
          <AriaSelect.SelectGroup items={items}>
            {(item) => <AriaSelect.SelectItem id={item.value}>{item.label}</AriaSelect.SelectItem>}
          </AriaSelect.SelectGroup>
        </AriaSelect.SelectContent>
      </AriaSelect.Select>
      <UI.Text>{'Selected native multiples: ' + multi.join(',')}</UI.Text>
      <UI.Text>{'Select value height: ' + valueHeight}</UI.Text>
      <AriaSelect.Select value={country} onValueChange={(value) => setCountry(String(value))}>
        <AriaSelect.SelectTrigger
          accessibilityLabel="Search native countries"
          style={{ width: 320 }}
        >
          <AriaSelect.SelectValue placeholder="Choose a country" />
        </AriaSelect.SelectTrigger>
        <RegistrySelectAutocomplete filter={contains}>
          <AriaSelect.SelectPopover>
            <AriaSelect.SelectInput
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <AriaSelect.SelectList
              renderEmptyState={() => (
                <AriaSelect.SelectEmpty>No native countries</AriaSelect.SelectEmpty>
              )}
            >
              <AriaSelect.SelectGroup
                items={[
                  { value: 'ivory-coast', label: 'Côte d’Ivoire' },
                  { value: 'turkey', label: 'Türkiye' },
                ]}
              >
                {(item) => (
                  <AriaSelect.SelectItem id={item.value}>{item.label}</AriaSelect.SelectItem>
                )}
              </AriaSelect.SelectGroup>
            </AriaSelect.SelectList>
          </AriaSelect.SelectPopover>
        </RegistrySelectAutocomplete>
      </AriaSelect.Select>
      <UI.Text>{'Selected native country: ' + country}</UI.Text>
      <UI.Select value={long} onValueChange={(value) => setLong(String(value))}>
        <UI.SelectTrigger accessibilityLabel="Open long native list" style={{ width: 320 }}>
          <UI.SelectValue />
        </UI.SelectTrigger>
        <UI.SelectContent side="left" align="start" testID="native-long-select-surface">
          <UI.SelectGroup>
            {Array.from({ length: 30 }, (_, index) => (
              <UI.SelectItem key={index} value={String(index)}>
                {'Native long option ' + index}
              </UI.SelectItem>
            ))}
          </UI.SelectGroup>
        </UI.SelectContent>
      </UI.Select>
      <UI.Text>{'Selected native long option: ' + long}</UI.Text>
    </View>
  );
}

function NativeInputGroupProbe({ onChange }: { onChange: (value: string) => void }) {
  const group = useContext(NativeInputGroupContext);
  useEffect(() => {
    const inputs = [...(group?.controls.values() ?? [])].filter((entry) => entry.kind === 'input');
    onChange(
      'inputs=' +
        inputs.length +
        '; refs=' +
        inputs.map((entry) => !!entry.ref?.current).join(',') +
        '; disabled=' +
        inputs.map((entry) => !!entry.disabled).join(','),
    );
  }, [group, onChange]);
  return null;
}
function NativeInputGroupMatrix() {
  const presets = [
    'nova',
    'vega',
    'maia',
    'lyra',
    'mira',
    'luma',
    'sera',
    'rhea',
    'default',
    'new-york',
    'new-york-v4',
  ] as const;
  const [index, setIndex] = useState(0),
    [frame, setFrame] = useState(''),
    [value, setValue] = useState(''),
    [actions, setActions] = useState(0),
    [disabled, setDisabled] = useState(false),
    [message, setMessage] = useState(''),
    [messageHeight, setMessageHeight] = useState(0),
    [registration, setRegistration] = useState('pending'),
    [focusEvents, setFocusEvents] = useState(0),
    directRef = useRef<import('react-native').TextInput>(null);
  const preset = presets[index]!;
  return (
    <View style={{ width: 320, gap: 8 }}>
      <UI.Text>{'Input group preset: ' + preset}</UI.Text>
      <UI.Text>{'Input group geometry: ' + preset + ':' + frame}</UI.Text>
      <UI.Button onPress={() => setIndex((index + 1) % presets.length)}>
        Next input group preset
      </UI.Button>
      <NativeRegistryPalette
        source={
          preset === 'default' || preset === 'new-york' || preset === 'new-york-v4'
            ? preset
            : 'base'
        }
        generation={preset === 'default' || preset === 'new-york' ? 'legacy' : 'modern'}
      >
        <UI.NativeComponentStyleProvider style={preset}>
          <UI.InputGroup
            key={preset}
            disabled={disabled}
            onLayout={({ nativeEvent: { layout } }) =>
              setFrame(Math.round(layout.width) + 'x' + Math.round(layout.height))
            }
          >
            <NativeInputGroupProbe onChange={setRegistration} />
            <UI.InputGroupAddon accessibilityLabel="Focus grouped input" accessible>
              <UI.InputGroupText>Find</UI.InputGroupText>
            </UI.InputGroupAddon>
            <UI.InputGroupInput
              accessibilityLabel="Native grouped input"
              ref={directRef}
              onFocus={() => setFocusEvents((n) => n + 1)}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={value}
              onChangeText={setValue}
            />
            <UI.InputGroupAddon align="inline-end">
              <UI.InputGroupButton
                onPress={() => {
                  setActions((n) => n + 1);
                  Keyboard.dismiss();
                }}
              >
                Send grouped input
              </UI.InputGroupButton>
            </UI.InputGroupAddon>
          </UI.InputGroup>
          <UI.InputGroup>
            <UI.InputGroupInput
              accessibilityLabel="Readonly grouped input"
              readOnly
              value="Retained"
            />
          </UI.InputGroup>
          <UI.InputGroup>
            <UI.Popover>
              <UI.PopoverTrigger asChild>
                <UI.InputGroupAddon>
                  <UI.InputGroupButton size="icon-xs" accessibilityLabel="Open grouped info">
                    ?
                  </UI.InputGroupButton>
                </UI.InputGroupAddon>
              </UI.PopoverTrigger>
              <UI.PopoverContent>
                <UI.Text>Grouped connection info</UI.Text>
                <UI.PopoverClose>Close grouped info</UI.PopoverClose>
              </UI.PopoverContent>
            </UI.Popover>
            <UI.InputGroupInput accessibilityLabel="Info grouped value" />
          </UI.InputGroup>
        </UI.NativeComponentStyleProvider>
      </NativeRegistryPalette>
      <UI.NativeComponentStyleProvider style="nova">
        <UI.InputGroup>
          <UI.InputGroupTextarea
            accessibilityLabel="Grouped growing textarea"
            value={message}
            onChangeText={setMessage}
            onLayout={({ nativeEvent: { layout } }) => setMessageHeight(Math.round(layout.height))}
          />
          <UI.InputGroupAddon align="block-end">
            <UI.Kbd>Enter</UI.Kbd>
          </UI.InputGroupAddon>
        </UI.InputGroup>
      </UI.NativeComponentStyleProvider>
      <UI.Text>{'Grouped textarea height: ' + messageHeight}</UI.Text>
      <UI.Text>{'Group registration: ' + registration}</UI.Text>
      <UI.Text>{'Group focus events: ' + focusEvents}</UI.Text>
      <UI.Text>{'Input group disabled: ' + disabled}</UI.Text>
      <UI.Button onPress={() => directRef.current?.focus()}>
        Focus grouped input explicitly
      </UI.Button>
      <UI.Text>{'Grouped input value: ' + value}</UI.Text>
      <UI.Text>{'Grouped input actions: ' + actions}</UI.Text>
      <UI.Button
        onPress={() => {
          Keyboard.dismiss();
          setDisabled(!disabled);
        }}
      >
        Toggle input group disabled
      </UI.Button>
      <UI.Button onPress={() => Keyboard.dismiss()}>Dismiss grouped keyboard</UI.Button>
    </View>
  );
}
function NativeInputMatrix() {
  const [height, setHeight] = useState(0),
    [frames, setFrames] = useState<Record<string, string>>({}),
    [rowsHeight, setRowsHeight] = useState(0);
  return (
    <View style={{ gap: 12 }}>
      {(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const).map((preset) => (
        <UI.NativeComponentStyleProvider key={preset} style={preset}>
          <UI.Input
            accessibilityLabel={'Native input ' + preset}
            placeholder={preset}
            onLayout={({ nativeEvent: { layout } }) =>
              setFrames((previous) => ({
                ...previous,
                [preset]: Math.round(layout.width) + 'x' + Math.round(layout.height),
              }))
            }
            style={{ width: 160 }}
          />
        </UI.NativeComponentStyleProvider>
      ))}
      <UI.Text>
        {'Input geometry: ' +
          ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea']
            .map((name) => name + '=' + frames[name])
            .join('; ')}
      </UI.Text>
      <NativeRegistryPalette generation="legacy" source="default">
        <UI.Text>{'Legacy textarea height: ' + rowsHeight}</UI.Text>
        <SourceTextarea
          rows={3}
          accessibilityLabel="Native fixed rows"
          onLayout={(event) => setRowsHeight(Math.round(event.nativeEvent.layout.height))}
        />
      </NativeRegistryPalette>
      <UI.Text>{'Textarea height: ' + height}</UI.Text>
      <UI.Textarea
        accessibilityLabel="Native growing textarea"
        onLayout={(event) => setHeight(Math.round(event.nativeEvent.layout.height))}
      />
      <UI.Button onPress={() => Keyboard.dismiss()}>Dismiss native keyboard</UI.Button>
    </View>
  );
}
function NativeFileMatrix() {
  const [selection, setSelection] = useState('none'),
    [cancelled, setCancelled] = useState(0);
  return (
    <View style={{ gap: 12 }}>
      <UI.FileInput
        accessibilityLabel="Native document"
        accept="text/plain"
        onFilesChange={(files) =>
          setSelection(
            files.map((file) => file.name + ':' + String(file.uri.startsWith('file://'))).join(','),
          )
        }
        onPickerCancel={() => setCancelled((n) => n + 1)}
      />
      <UI.Text>{'Document selection: ' + selection}</UI.Text>
      <UI.Text>{'Document cancellations: ' + cancelled}</UI.Text>
    </View>
  );
}
function NativeTemporalMatrix() {
  const [date, setDate] = useState('none'),
    [time, setTime] = useState('none');
  return (
    <View style={{ gap: 12 }}>
      <UI.TemporalInput
        type="date"
        accessibilityLabel="Native date"
        defaultValue="2026-10-25"
        onChange={setDate}
      />
      <UI.TemporalInput
        type="time"
        accessibilityLabel="Native time"
        defaultValue="15:42"
        onChange={setTime}
      />
      <UI.Text>{'Date selection: ' + date}</UI.Text>
      <UI.Text>{'Time selection: ' + time}</UI.Text>
    </View>
  );
}
const SourceCallbackButton = withRegistryStyles(UI.Button, 'button');
const SourceSpinner = withRegistryStyles(UI.Spinner);
function NativeSpinnerMatrix() {
  const [frame, setFrame] = useState('pending'),
    [badgeFrame, setBadgeFrame] = useState('pending'),
    [actions, setActions] = useState(0),
    [moving, setMoving] = useState(true);
  return (
    <View style={{ gap: 16 }}>
      <UI.Text>{'Spinner geometry: ' + frame}</UI.Text>
      <UI.Text>{'Badge spinner geometry: ' + badgeFrame}</UI.Text>
      <UI.Text>{'Spinner actions: ' + actions}</UI.Text>
      <UI.Text>{moving ? 'Spinner motion active' : 'Spinner motion stopped'}</UI.Text>
      <SourceSpinner
        accessibilityLabel="Native source spinner"
        className="size-6 text-red-500"
        animating={moving}
        hidesWhenStopped={false}
        onLayout={({ nativeEvent: { layout } }) =>
          setFrame(Math.round(layout.width) + 'x' + Math.round(layout.height))
        }
      />
      <UI.Badge>
        <SourceSpinner
          className="size-6"
          accessibilityLabel="Native badge spinner"
          onLayout={({ nativeEvent: { layout } }) =>
            setBadgeFrame(Math.round(layout.width) + 'x' + Math.round(layout.height))
          }
        />{' '}
        Syncing
      </UI.Badge>
      <UI.Button onPress={() => setActions((n) => n + 1)}>
        <SourceSpinner />
        Spinner action
      </UI.Button>
      <UI.Button onPress={() => setMoving(false)}>Stop native spinner</UI.Button>
    </View>
  );
}
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
const MeasuredSourceExample = withRegistryStyles(SourceExample),
  MeasuredSourceExampleWrapper = withRegistryStyles(SourceExampleWrapper);
function NativeChartMatrix() {
  const presets = [
    'nova',
    'vega',
    'maia',
    'lyra',
    'mira',
    'luma',
    'sera',
    'rhea',
    'default',
    'new-york',
    'new-york-v4',
  ] as const;
  const kinds = ['bar', 'line', 'area', 'pie', 'radar', 'radial'] as const;
  const [presetIndex, setPresetIndex] = useState(0),
    [kindIndex, setKindIndex] = useState(0),
    [value, setValue] = useState(0),
    [tooltip, setTooltip] = useState('');
  const ChartKind = [
    UI.BarChart,
    UI.LineChart,
    UI.AreaChart,
    UI.PieChart,
    UI.RadarChart,
    UI.RadialBarChart,
  ][kindIndex]!;
  const Series = [UI.Bar, UI.Line, UI.Area, UI.Pie, UI.Radar, UI.RadialBar][kindIndex]!;
  const preset = presets[presetIndex]!,
    kind = kinds[kindIndex]!;
  const data = [
    { month: 'January', visits: 10 },
    { month: 'February', visits: 20 },
    { month: 'March', visits: 30 },
  ];
  return (
    <View style={{ width: 320, gap: 8 }}>
      <UI.Text>{'Chart preset: ' + preset}</UI.Text>
      <UI.Text>{'Chart kind: ' + kind}</UI.Text>
      <UI.Text>{'Chart selection: ' + data[value]!.month + '=' + data[value]!.visits}</UI.Text>
      <UI.Button onPress={() => setPresetIndex((presetIndex + 1) % presets.length)}>
        Next chart preset
      </UI.Button>
      <UI.Button onPress={() => setKindIndex((kindIndex + 1) % kinds.length)}>
        Next chart kind
      </UI.Button>
      <UI.Button onPress={() => setValue((value + 1) % data.length)}>Next chart point</UI.Button>
      <UI.NativeComponentStyleProvider style={preset}>
        <UI.ChartContainer
          key={preset + '/' + kind}
          config={{
            visits: { label: 'Visits', color: 'var(--chart-1)' },
            January: { label: 'January' },
            February: { label: 'February' },
            March: { label: 'March' },
          }}
          style={{ width: 320, height: 200 }}
        >
          <ChartKind data={data} width={320} height={200} value={value} onValueChange={setValue}>
            <Series dataKey="visits" fill="var(--color-visits)" stroke="var(--color-visits)" />
            <UI.ChartTooltip
              content={
                <UI.ChartTooltipContent
                  onLayout={({ nativeEvent: { layout } }) => {
                    const next =
                      preset + ':' + Math.round(layout.width) + 'x' + Math.round(layout.height);
                    setTooltip((previous) => (previous === next ? previous : next));
                  }}
                />
              }
            />
          </ChartKind>
        </UI.ChartContainer>
      </UI.NativeComponentStyleProvider>
      <UI.Text>{'Tooltip geometry: ' + tooltip}</UI.Text>
    </View>
  );
}
function NativeExampleLayoutMatrix() {
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const measure =
    (name: string, position = false) =>
    (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      const next = (position ? [x, y, width, height] : [width, height])
        .map(Math.round)
        .join(position ? ',' : 'x');
      setMetrics((previous) =>
        previous[name] === next ? previous : { ...previous, [name]: next },
      );
    };

  return (
    <View style={{ width: 320, gap: 12 }}>
      <MeasuredSourceExampleWrapper className="min-h-0 p-0 max-w-none" style={{ width: 320 }}>
        <MeasuredSourceExample onLayout={measure('panel')}>
          <RegistryView style={{ width: 20, height: 20 }} onLayout={measure('child', true)} />
        </MeasuredSourceExample>
      </MeasuredSourceExampleWrapper>
      <UI.Text>{'Example panel geometry: ' + metrics.panel}</UI.Text>
      <UI.Text>{'Example child geometry: ' + metrics.child}</UI.Text>
      <MeasuredSourceExampleWrapper className="min-h-0 p-0 max-w-none" style={{ width: 320 }}>
        <MeasuredSourceExample className="p-0" onLayout={measure('zero')}>
          <RegistryView style={{ width: 20, height: 20 }} onLayout={measure('zeroChild', true)} />
        </MeasuredSourceExample>
      </MeasuredSourceExampleWrapper>
      <UI.Text>{'Example zero geometry: ' + metrics.zero}</UI.Text>
      <UI.Text>{'Example zero child: ' + metrics.zeroChild}</UI.Text>
      <MeasuredSourceExampleWrapper
        className="min-h-0 p-0 max-w-none grid-cols-2"
        style={{ width: 320 }}
      >
        <MeasuredSourceExample onLayout={measure('left')}>
          <RegistryView style={{ width: 20, height: 20 }} />
        </MeasuredSourceExample>
        <MeasuredSourceExample onLayout={measure('right')}>
          <RegistryView style={{ width: 20, height: 20 }} />
        </MeasuredSourceExample>
      </MeasuredSourceExampleWrapper>
      <UI.Text>{'Example grid geometry: ' + metrics.left + ';' + metrics.right}</UI.Text>
    </View>
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
class Boundary extends React.Component<
  { children: React.ReactNode; onError?: (message: string) => void },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }
  render() {
    return this.state.error ? (
      <Text accessibilityRole="alert">{this.state.error}</Text>
    ) : (
      this.props.children
    );
  }
}
/** Each step waits for a real native layout and subsequent frames before unmounting. */
function NativeRuntimeSweep() {
  const authored = stories.filter((story) => 'authored' in story && story.authored);
  const [index, setIndex] = useState(0),
    [committed, setCommitted] = useState(-1),
    [errors, setErrors] = useState<Record<string, string>>({});
  const active = authored[index];
  useEffect(() => {
    if (!active || committed !== index) return;
    let second: number | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        timer = setTimeout(
          () => setIndex((previous) => (previous === index ? previous + 1 : previous)),
          200,
        );
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second !== undefined) cancelAnimationFrame(second);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [index, committed, active]);
  const complete = index === authored.length;
  return (
    <View style={{ gap: 12 }}>
      <UI.Text>{'Runtime sweep planned: ' + authored.length}</UI.Text>
      <UI.Text testID="native-runtime-sweep-status">
        {complete
          ? Object.keys(errors).length
            ? 'Runtime sweep failed: ' + Object.keys(errors).length + ' of ' + authored.length
            : 'Runtime sweep passed: ' + index + '/' + authored.length
          : 'Runtime sweep progress: ' + index + '/' + authored.length}
      </UI.Text>
      <UI.Text>{active?.id ?? 'All authored stories visited'}</UI.Text>
      {Object.entries(errors).map(([id, message]) => (
        <UI.Text key={id} accessibilityRole="alert">
          {id + ': ' + message}
        </UI.Text>
      ))}
      {active && (
        <View
          key={active.id}
          style={{ width: '100%', minHeight: 1 }}
          onLayout={({ nativeEvent: { layout } }) => {
            if (
              Number.isFinite(layout.width) &&
              layout.width > 0 &&
              Number.isFinite(layout.height) &&
              layout.height >= 0
            )
              setCommitted(index);
          }}
        >
          <Boundary
            onError={(message) => setErrors((previous) => ({ ...previous, [active.id]: message }))}
          >
            <active.Component />
          </Boundary>
        </View>
      )}
    </View>
  );
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
