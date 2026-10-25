import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test('native compound combobox searches, exposes the selected value and ignores disabled choices', async () => {
  const change = jest.fn();
  await mount(
    <UI.Combobox
      items={['Alpha', 'Beta', 'Unavailable']}
      onValueChange={change}
      isItemDisabled={(value) => value === 'Unavailable'}
    >
      <UI.ComboboxInput placeholder="Choose" />
      <UI.ComboboxContent>
        <UI.ComboboxEmpty />
        <UI.ComboboxList<string>>
          {(value) => <UI.ComboboxItem value={value}>{value}</UI.ComboboxItem>}
        </UI.ComboboxList>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Choose' }));
  expect(screen.getByRole('radio', { name: 'Unavailable' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Search options'), 'bet');
  expect(screen.queryByRole('radio', { name: 'Alpha' })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('Beta');
  expect(screen.getByRole('combobox', { name: 'Choose' })).toHaveAccessibilityValue({
    text: 'Beta',
  });
  expect(screen.queryByLabelText('Search options')).toBeNull();
  await fireEvent.press(screen.getByRole('combobox', { name: 'Choose' }));
  expect(screen.getByLabelText('Search options')).toHaveDisplayValue('');
});
test('native multiple combobox keeps its surface open and removes selected chips by value', async () => {
  function Example() {
    const [selected, set] = React.useState<string[]>([]);
    return (
      <UI.Combobox multiple items={['Alpha', 'Beta']} value={selected} onValueChange={set}>
        <UI.ComboboxChips>
          {selected.map((value) => (
            <UI.ComboboxChip key={value} value={value} />
          ))}
          <UI.ComboboxChipsInput placeholder="Add" />
        </UI.ComboboxChips>
        <UI.ComboboxContent>
          <UI.ComboboxList<string>>
            {(value) => <UI.ComboboxItem value={value}>{value}</UI.ComboboxItem>}
          </UI.ComboboxList>
        </UI.ComboboxContent>
      </UI.Combobox>
    );
  }
  await mount(<Example />);
  await fireEvent.press(screen.getByRole('combobox', { name: 'Add' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Alpha' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Beta' }));
  expect(screen.getByRole('checkbox', { name: 'Alpha' })).toBeChecked();
  await fireEvent.press(
    screen.getByRole('button', { name: 'Dismiss overlay', includeHiddenElements: true }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Remove Alpha' }));
  expect(screen.queryByRole('button', { name: 'Remove Alpha' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Remove Beta' })).toBeOnTheScreen();
});
test('compound combobox respects controlled values and open state until the parent commits changes', async () => {
  const change = jest.fn(),
    open = jest.fn();
  await mount(
    <UI.Combobox
      open
      onOpenChange={open}
      value="Alpha"
      onValueChange={change}
      items={['Alpha', 'Beta']}
    >
      <UI.ComboboxTrigger />
      <UI.ComboboxContent>
        <UI.ComboboxCollection<string>>
          {(value) => <UI.ComboboxItem value={value}>{value}</UI.ComboboxItem>}
        </UI.ComboboxCollection>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('Beta');
  expect(open).toHaveBeenCalledWith(false);
  expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
  expect(screen.getByLabelText('Search options')).toBeOnTheScreen();
});
test('static compound items retain their display labels and accent-insensitive filtering', async () => {
  await mount(
    <UI.Combobox>
      <UI.ComboboxTrigger>Pick</UI.ComboboxTrigger>
      <UI.ComboboxContent>
        <UI.ComboboxInput placeholder="Find" accessibilityLabel="Find" />
        <UI.ComboboxEmpty>Nothing</UI.ComboboxEmpty>
        <UI.ComboboxGroup>
          <UI.ComboboxLabel>Places</UI.ComboboxLabel>
          <UI.ComboboxItem value="cafe">Café</UI.ComboboxItem>
          <UI.ComboboxSeparator />
          <UI.ComboboxItem value="office">Office</UI.ComboboxItem>
        </UI.ComboboxGroup>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Pick' }));
  await userEvent.type(screen.getByLabelText('Find'), 'cafe');
  expect(screen.getByRole('radio', { name: 'Café' })).toBeOnTheScreen();
  expect(screen.queryByText('Nothing')).toBeNull();
  await userEvent.clear(screen.getByLabelText('Find'));
  await userEvent.type(screen.getByLabelText('Find'), 'unknown');
  expect(screen.getByText('Nothing')).toBeOnTheScreen();
});
test('combobox item cancellation preserves the current selection and leaves the modal open', async () => {
  const change = jest.fn();
  await mount(
    <UI.Combobox defaultOpen items={['Alpha']} onValueChange={change}>
      <UI.ComboboxContent>
        <UI.ComboboxItem value="Alpha" onPress={(event) => event.preventDefault()}>
          Alpha
        </UI.ComboboxItem>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  let cancelled = false;
  await fireEvent.press(screen.getByRole('radio', { name: 'Alpha' }), {
    preventDefault: () => {
      cancelled = true;
    },
    isDefaultPrevented: () => cancelled,
  });
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Search options')).toBeOnTheScreen();
});
test('native object-valued combobox uses stable value IDs and explicit labels', async () => {
  type Item = { id: number; name: string };
  const item: Item = { id: 1, name: 'Project' };
  const change = jest.fn();
  await mount(
    <UI.Combobox<Item>
      items={[item]}
      itemToStringLabel={(value) => value.name}
      itemToStringValue={(value) => String(value.id)}
      onValueChange={change}
    >
      <UI.ComboboxTrigger>Project picker</UI.ComboboxTrigger>
      <UI.ComboboxContent>
        <UI.ComboboxList<Item>>
          {(value) => <UI.ComboboxItem value={value}>{value.name}</UI.ComboboxItem>}
        </UI.ComboboxList>
      </UI.ComboboxContent>
    </UI.Combobox>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Project picker' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Project' }));
  expect(change).toHaveBeenCalledWith(item);
});
test('native compound progress retains source value formatting, bounded state and unknown progress labels', async () => {
  const rendered = await mount(
    <UI.Progress value={25} max={50}>
      <UI.ProgressLabel>Uploading</UI.ProgressLabel>
      <UI.ProgressValue />
    </UI.Progress>,
  );
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 25, max: 50 });
  expect(screen.getByText('25%', { includeHiddenElements: true })).toBeOnTheScreen();
  await rendered.rerender(
    <UI.ThemeProvider>
      <UI.Progress value={null}>
        <UI.ProgressLabel>Waiting</UI.ProgressLabel>
        <UI.ProgressValue />
      </UI.Progress>
    </UI.ThemeProvider>,
  );
  expect(screen.getByRole('progressbar')).toBeBusy();
  expect(screen.getByRole('progressbar', { name: 'Waiting' })).toHaveAccessibilityValue({
    text: 'indeterminate progress',
  });
  expect(screen.queryByText('Loading')).toBeNull();
});
test.each([
  ['ar-EG', 'rtl'],
  ['he-IL', 'rtl'],
  ['ar-Latn', 'ltr'],
  ['en-US', 'ltr'],
] as const)(
  'native locale %s resolves %s and stays available through the locale hook',
  async (locale, direction) => {
    function Probe() {
      const value = UI.useLocale();
      return <UI.Text>{value.locale + ':' + value.direction}</UI.Text>;
    }
    await mount(
      <UI.I18nProvider locale={locale}>
        <Probe />
      </UI.I18nProvider>,
    );
    expect(screen.getByText(locale + ':' + direction)).toBeOnTheScreen();
  },
);
test('native range calendar adapter retains range selection and day-button accessibility', async () => {
  const change = jest.fn();
  await mount(
    <>
      <UI.RangeCalendar defaultMonth={new Date(2026, 0, 1)} locale="en-US" onSelect={change} />
      <UI.CalendarDayButton
        day={new Date(2026, 1, 1)}
        modifiers={{ selected: true, disabled: true }}
      >
        Selected day
      </UI.CalendarDayButton>
    </>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Thursday, January 1, 2026' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Saturday, January 3, 2026' }));
  expect(change.mock.calls.at(-1)?.[0]).toEqual({
    from: new Date(2026, 0, 1),
    to: new Date(2026, 0, 3),
  });
  expect(screen.getByRole('button', { name: 'February 1, 2026' })).toBeDisabled();
});

test('compound native select filters choices, exposes an empty result and clears its query after selection', async () => {
  const change = jest.fn();
  await mount(
    <UI.Select onValueChange={change}>
      <UI.SelectTrigger accessibilityLabel="Project">
        <UI.SelectValue placeholder="Choose project" />
      </UI.SelectTrigger>
      <UI.SelectPopover>
        <UI.SelectInput />
        <UI.SelectEmpty />
        <UI.SelectList>
          <UI.SelectItem value="alpha">Alpha</UI.SelectItem>
          <UI.SelectItem value="beta">Beta</UI.SelectItem>
        </UI.SelectList>
      </UI.SelectPopover>
    </UI.Select>,
  );
  await fireEvent.press(screen.getByRole('combobox', { name: 'Project' }));
  await userEvent.type(screen.getByLabelText('Search options'), 'unknown');
  expect(screen.getByText('No options found')).toBeOnTheScreen();
  expect(screen.queryByRole('radio', { name: 'Alpha' })).toBeNull();
  await userEvent.clear(screen.getByLabelText('Search options'));
  await userEvent.type(screen.getByLabelText('Search options'), 'bet');
  expect(screen.queryByText('No options found')).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(change).toHaveBeenCalledWith('beta');
  await fireEvent.press(screen.getByRole('combobox', { name: 'Project' }));
  expect(screen.getByLabelText('Search options')).toHaveDisplayValue('');
  expect(screen.getByRole('radio', { name: 'Alpha' })).toBeOnTheScreen();
});
test('native link buttons open external links through the OS bridge and delegate application navigation', async () => {
  const bridge = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const navigate = jest.fn();
  try {
    await mount(
      <>
        <UI.LinkButton href="https://example.com">Website</UI.LinkButton>
        <UI.LinkButton href="/projects" onNavigate={navigate}>
          Projects
        </UI.LinkButton>
      </>,
    );
    await fireEvent.press(screen.getByRole('link', { name: 'Website' }));
    expect(bridge).toHaveBeenCalledWith('https://example.com');
    await fireEvent.press(screen.getByRole('link', { name: 'Projects' }));
    expect(navigate).toHaveBeenCalledWith('/projects');
    expect(bridge).toHaveBeenCalledTimes(1);
  } finally {
    bridge.mockRestore();
  }
});
test('native link cancellation blocks navigation and bridge failures remain recoverable', async () => {
  const bridge = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Unavailable'));
  const error = jest.fn();
  try {
    await mount(
      <>
        <UI.LinkButton href="https://example.com" onPress={(event) => event.preventDefault()}>
          Cancelled
        </UI.LinkButton>
        <UI.LinkButton href="https://example.com" onError={error}>
          Retry link
        </UI.LinkButton>
      </>,
    );
    let cancelled = false;
    await fireEvent.press(screen.getByRole('link', { name: 'Cancelled' }), {
      preventDefault: () => {
        cancelled = true;
      },
      isDefaultPrevented: () => cancelled,
    });
    expect(bridge).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('link', { name: 'Retry link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to open link.');
    expect(error).toHaveBeenCalledTimes(1);
    bridge.mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole('link', { name: 'Retry link' }));
    expect(screen.queryByRole('alert')).toBeNull();
  } finally {
    bridge.mockRestore();
  }
});
