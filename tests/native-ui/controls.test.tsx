import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);

test('checkbox changes uncontrolled state and honours disabled and indeterminate values', async () => {
  const change = jest.fn();
  const user = userEvent.setup();
  await mount(
    <>
      <UI.Checkbox accessibilityLabel="Accept" checked="indeterminate" onCheckedChange={change} />
      <UI.Checkbox accessibilityLabel="Disabled" disabled />
    </>,
  );
  expect(screen.getByRole('checkbox', { name: 'Accept' })).toBePartiallyChecked();
  await user.press(screen.getByRole('checkbox', { name: 'Accept' }));
  expect(change).toHaveBeenCalledWith(true);
  await user.press(screen.getByRole('checkbox', { name: 'Disabled' }));
  expect(screen.getByRole('checkbox', { name: 'Disabled' })).not.toBeChecked();
});
test('controlled checkbox requests a change without mutating its supplied state', async () => {
  const change = jest.fn();
  await mount(
    <UI.Checkbox checked={false} onCheckedChange={change} accessibilityLabel="Controlled" />,
  );
  await userEvent.press(screen.getByRole('checkbox'));
  expect(change).toHaveBeenCalledWith(true);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
test('switch emits native values and preserves disabled state', async () => {
  const change = jest.fn();
  await mount(
    <UI.Switch accessibilityLabel="Notifications" defaultChecked onCheckedChange={change} />,
  );
  expect(screen.getByRole('switch')).toBeChecked();
  await fireEvent(screen.getByRole('switch'), 'valueChange', false);
  expect(change).toHaveBeenCalledWith(false);
  expect(screen.getByRole('switch')).not.toBeChecked();
});
test('radio group selects exactly one enabled item', async () => {
  const change = jest.fn();
  await mount(
    <UI.RadioGroup defaultValue="a" onValueChange={change}>
      <UI.RadioGroupItem value="a">Alpha</UI.RadioGroupItem>
      <UI.RadioGroupItem value="b">Beta</UI.RadioGroupItem>
      <UI.RadioGroupItem value="c" disabled>
        Disabled
      </UI.RadioGroupItem>
    </UI.RadioGroup>,
  );
  await userEvent.press(screen.getByRole('radio', { name: 'Beta' }));
  expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked();
  await userEvent.press(screen.getByRole('radio', { name: 'Disabled' }));
  expect(change).toHaveBeenCalledTimes(1);
});
test('toggle and multiple toggle group preserve independent choices', async () => {
  const change = jest.fn();
  await mount(
    <UI.ToggleGroup type="multiple" onValueChange={change}>
      <UI.ToggleGroupItem value="bold">Bold</UI.ToggleGroupItem>
      <UI.ToggleGroupItem value="italic">Italic</UI.ToggleGroupItem>
    </UI.ToggleGroup>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Bold' }));
  await userEvent.press(screen.getByRole('button', { name: 'Italic' }));
  expect(change).toHaveBeenLastCalledWith(['bold', 'italic']);
  await userEvent.press(screen.getByRole('button', { name: 'Bold' }));
  expect(change).toHaveBeenLastCalledWith(['italic']);
});
test('tabs expose one panel, selected state and disabled trigger semantics', async () => {
  await mount(
    <UI.Tabs defaultValue="a">
      <UI.TabsList>
        <UI.TabsTrigger value="a">Alpha</UI.TabsTrigger>
        <UI.TabsTrigger value="b">Beta</UI.TabsTrigger>
        <UI.TabsTrigger value="c" disabled>
          Disabled
        </UI.TabsTrigger>
      </UI.TabsList>
      <UI.TabsContent value="a">First</UI.TabsContent>
      <UI.TabsContent value="b">Second</UI.TabsContent>
    </UI.Tabs>,
  );
  expect(screen.getByText('First')).toBeOnTheScreen();
  expect(screen.queryByText('Second')).toBeNull();
  await userEvent.press(screen.getByRole('tab', { name: 'Beta' }));
  expect(screen.queryByText('First')).toBeNull();
  expect(screen.getByText('Second')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('tab', { name: 'Disabled' }));
  expect(screen.getByText('Second')).toBeOnTheScreen();
});
test('single accordion closes peers and permits collapse only when configured', async () => {
  await mount(
    <UI.Accordion type="single" defaultValue="one">
      <UI.AccordionItem value="one">
        <UI.AccordionTrigger>One</UI.AccordionTrigger>
        <UI.AccordionContent>First</UI.AccordionContent>
      </UI.AccordionItem>
      <UI.AccordionItem value="two">
        <UI.AccordionTrigger>Two</UI.AccordionTrigger>
        <UI.AccordionContent>Second</UI.AccordionContent>
      </UI.AccordionItem>
    </UI.Accordion>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'One' }));
  expect(screen.getByText('First')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Two' }));
  expect(screen.queryByText('First')).toBeNull();
  expect(screen.getByText('Second')).toBeOnTheScreen();
});
test('multiple accordion and collapsible retain independent expanded content', async () => {
  await mount(
    <UI.Accordion type="multiple">
      <UI.AccordionItem value="one">
        <UI.AccordionTrigger>One</UI.AccordionTrigger>
        <UI.AccordionContent>First</UI.AccordionContent>
      </UI.AccordionItem>
      <UI.AccordionItem value="two">
        <UI.AccordionTrigger>Two</UI.AccordionTrigger>
        <UI.AccordionContent>Second</UI.AccordionContent>
      </UI.AccordionItem>
    </UI.Accordion>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'One' }));
  await userEvent.press(screen.getByRole('button', { name: 'Two' }));
  expect(screen.getByText('First')).toBeOnTheScreen();
  expect(screen.getByText('Second')).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'One' }));
  expect(screen.queryByText('First')).toBeNull();
});
test('field errors deduplicate messages and label the input without leaking host props', async () => {
  await mount(
    <UI.Field invalid>
      <UI.FieldLabel>Email</UI.FieldLabel>
      <UI.FieldInput testID="email" />
      <UI.FieldError errors={[{ message: 'Required' }, { message: 'Required' }]} />
    </UI.Field>,
  );
  expect(screen.getAllByRole('alert')).toHaveLength(1);
  expect(screen.getByRole('alert')).toHaveTextContent('Required');
  expect(screen.getByTestId('email').props.accessibilityLabelledBy).toBeTruthy();
  expect(screen.getByTestId('email').props.invalid).toBeUndefined();
});
test('OTP strips non-digits, bounds pasted input and completes once per changed full code', async () => {
  const change = jest.fn();
  const complete = jest.fn();
  await mount(<UI.InputOTP maxLength={4} onChange={change} onComplete={complete} />);
  await fireEvent.changeText(screen.getByLabelText('One-time code'), 'a12 345');
  expect(change).toHaveBeenLastCalledWith('1234');
  expect(complete).toHaveBeenCalledWith('1234');
  await fireEvent.changeText(screen.getByLabelText('One-time code'), '1234');
  expect(complete).toHaveBeenCalledTimes(1);
});
test('textarea and input group preserve native editing props', async () => {
  const change = jest.fn();
  await mount(
    <UI.InputGroup>
      <UI.InputGroupTextarea accessibilityLabel="Notes" onChangeText={change} />
    </UI.InputGroup>,
  );
  const input = screen.getByLabelText('Notes');
  expect(input.props.multiline).toBe(true);
  await fireEvent.changeText(input, 'Line one\nLine two');
  expect(change).toHaveBeenCalledWith('Line one\nLine two');
});
test('button link role, variants and disabled state survive native composition', async () => {
  const action = jest.fn();
  await mount(
    <UI.BreadcrumbLink disabled onPress={action}>
      Home
    </UI.BreadcrumbLink>,
  );
  const link = screen.getByRole('link');
  expect(link).toBeDisabled();
  await userEvent.press(link);
  expect(action).not.toHaveBeenCalled();
});

test('single toggle groups preserve array-valued source callbacks and single-selection ownership', async () => {
  const change = jest.fn();
  const tree = await mount(
    <UI.ToggleGroup defaultValue={['16']} onValueChange={change}>
      <UI.ToggleGroupItem value="16">16px</UI.ToggleGroupItem>
      <UI.ToggleGroupItem value="24">24px</UI.ToggleGroupItem>
    </UI.ToggleGroup>,
  );
  await fireEvent.press(screen.getByRole('button', { name: '24px' }));
  expect(change).toHaveBeenLastCalledWith(['24']);
  expect(screen.getByRole('button', { name: '16px' }).props.accessibilityState.selected).toBe(
    false,
  );
  await fireEvent.press(screen.getByRole('button', { name: '24px' }));
  expect(change).toHaveBeenLastCalledWith([]);
  await tree.rerender(
    <UI.ThemeProvider>
      <UI.ToggleGroup value={['16']} onValueChange={change}>
        <UI.ToggleGroupItem value="16">16px</UI.ToggleGroupItem>
        <UI.ToggleGroupItem value="24">24px</UI.ToggleGroupItem>
      </UI.ToggleGroup>
    </UI.ThemeProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: '24px' }));
  expect(change).toHaveBeenLastCalledWith(['24']);
  expect(screen.getByRole('button', { name: '16px' }).props.accessibilityState.selected).toBe(true);
});
