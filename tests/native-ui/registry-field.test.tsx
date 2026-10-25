import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as UI from './.generated';
import {
  NativeRegistryPalette,
  NativeComponentStyleProvider,
} from './.generated/src/native/_registry-context';
import { NativePhysicalPortalBoundary } from './.generated/src/native/_physical-scope';
const styles = [
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
function wrap(children: React.ReactNode, style: (typeof styles)[number] = 'nova') {
  return (
    <UI.ThemeProvider>
      <NativeComponentStyleProvider style={style}>
        <NativeRegistryPalette
          generation={style === 'default' || style === 'new-york' ? 'legacy' : 'modern'}
          source={
            style === 'default' || style === 'new-york' || style === 'new-york-v4' ? style : 'base'
          }
        >
          {children}
        </NativeRegistryPalette>
      </NativeComponentStyleProvider>
    </UI.ThemeProvider>
  );
}
test.each(styles)(
  '%s Field keeps source orientation, label typography, field content, errors and separators',
  async (style) => {
    await render(
      wrap(
        <UI.FieldSet>
          <UI.FieldLegend variant="legend">Preferences</UI.FieldLegend>
          <UI.FieldGroup>
            <UI.Field orientation="horizontal" testID="field">
              <UI.Checkbox testID="check" />
              <UI.FieldContent testID="content">
                <UI.FieldLabel>Updates</UI.FieldLabel>
                <UI.FieldDescription>Product news</UI.FieldDescription>
              </UI.FieldContent>
            </UI.Field>
            <UI.FieldError
              errors={[{ message: 'Required' }, { message: 'Required' }, { message: 'Try again' }]}
            />
            <UI.FieldSeparator testID="separator">Or continue</UI.FieldSeparator>
          </UI.FieldGroup>
        </UI.FieldSet>,
        style,
      ),
    );
    expect(screen.getByTestId('field')).toHaveStyle({
      flexDirection: 'row',
      alignItems: 'flex-start',
    });
    expect(screen.getByTestId('content')).toHaveStyle({ flexGrow: 1, flexDirection: 'column' });
    if (style === 'lyra')
      expect(screen.getByText('Updates').props.style).not.toEqual(
        expect.objectContaining({ fontWeight: '500' }),
      );
    else
      expect(screen.getByText('Updates')).toHaveStyle({
        fontWeight: style === 'sera' ? '600' : '500',
      });
    expect(screen.getByRole('alert')).toHaveTextContent(/Required/);
    expect(screen.getByRole('alert')).toHaveTextContent(/Try again/);
    expect(screen.getAllByText('• Required')).toHaveLength(1);
    expect(screen.getByTestId('separator')).toHaveStyle({ height: 20 });
    expect(screen.getByText('Or continue')).toBeTruthy();
  },
);
test('Field responsive orientation follows measured nearest FieldGroup at the source 28rem breakpoint, including physical portal isolation', async () => {
  await render(
    wrap(
      <UI.FieldGroup testID="group">
        <UI.Field orientation="responsive" testID="responsive">
          <UI.FieldLabel>Account</UI.FieldLabel>
          <UI.Input />
        </UI.Field>
        <NativePhysicalPortalBoundary>
          <UI.Field orientation="responsive" testID="portal" />
        </NativePhysicalPortalBoundary>
      </UI.FieldGroup>,
    ),
  );
  expect(screen.getByTestId('responsive')).toHaveStyle({ flexDirection: 'column' });
  await fireEvent(screen.getByTestId('group'), 'layout', {
    nativeEvent: { layout: { width: 447, height: 100, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('responsive')).toHaveStyle({ flexDirection: 'column' });
  await fireEvent(screen.getByTestId('group'), 'layout', {
    nativeEvent: { layout: { width: 448, height: 100, x: 0, y: 0 } },
  });
  expect(screen.getByTestId('responsive')).toHaveStyle({ flexDirection: 'row' });
  expect(screen.getByTestId('portal')).toHaveStyle({ flexDirection: 'column' });
});
test('FieldLabel targets its explicit control while FieldTitle stays non-interactive', async () => {
  let first: TextInput | null = null,
    second: TextInput | null = null;
  await render(
    wrap(
      <UI.Field>
        <UI.FieldLabel controlID="first">First</UI.FieldLabel>
        <UI.Input
          nativeID="first"
          ref={(node) => {
            first = node;
          }}
        />
        <UI.Input
          nativeID="second"
          ref={(node) => {
            second = node;
          }}
        />
        <UI.FieldTitle testID="title">Informational title</UI.FieldTitle>
      </UI.Field>,
    ),
  );
  expect(first).not.toBe(second);
  const focusFirst = jest.spyOn(first!, 'focus');
  focusFirst.mockClear();
  await fireEvent.press(screen.getByText('First'));
  expect(focusFirst).toHaveBeenCalledTimes(1);
  expect(focusFirst.mock.contexts).toEqual([first]);
  focusFirst.mockRestore();
  expect(screen.getByTestId('title').props.onPress).toBeUndefined();
});
test('FieldLabel choice card activates its real control, mirrors checked appearance and honors disabled state', async () => {
  function Example() {
    const [value, set] = useState(false);
    return (
      <UI.FieldLabel testID="card">
        <UI.Field orientation="horizontal">
          <UI.Checkbox testID="checkbox" checked={value} onCheckedChange={set} />
          <UI.FieldContent>
            <UI.FieldTitle>Backups</UI.FieldTitle>
            <UI.FieldDescription>Save automatically</UI.FieldDescription>
          </UI.FieldContent>
        </UI.Field>
      </UI.FieldLabel>
    );
  }
  await render(wrap(<Example />));
  expect(screen.getByTestId('checkbox').props.accessibilityState.checked).toBe(false);
  await fireEvent.press(screen.getByTestId('card'));
  expect(screen.getByTestId('checkbox').props.accessibilityState.checked).toBe(true);
});
test('disabled FieldSet reaches nested Fields and validation errors deduplicate with authored children taking precedence', async () => {
  await render(
    wrap(
      <UI.FieldSet disabled>
        <UI.Field>
          <UI.FieldLabel>Disabled account</UI.FieldLabel>
          <UI.Input testID="disabled" />
          <UI.FieldError errors={[{ message: 'Ignored' }]}>Specific error</UI.FieldError>
        </UI.Field>
      </UI.FieldSet>,
    ),
  );
  expect(screen.getByTestId('disabled').props.editable).toBe(false);
  expect(screen.getByRole('alert')).toHaveTextContent('Specific error');
  expect(screen.queryByText('Ignored')).toBeNull();
});
test('authored Field descendant content widths stop at physical modal roots', async () => {
  const { withRegistryStyles } = require('./.generated/src/native/registry-styles');
  const Group = withRegistryStyles(UI.FieldGroup, 'view'),
    Content = withRegistryStyles(UI.FieldContent, 'view');
  await render(
    wrap(
      <Group className="**:data-[slot=field-content]:min-w-48">
        <Content testID="normal" />
        <NativePhysicalPortalBoundary>
          <Content testID="portal-content" />
        </NativePhysicalPortalBoundary>
      </Group>,
    ),
  );
  expect(screen.getByTestId('normal')).toHaveStyle({ minWidth: 192 });
  expect(screen.getByTestId('portal-content')).not.toHaveStyle({ minWidth: 192 });
});
test('Field disabled state blocks each native control and callback through nested fieldsets', async () => {
  const changed = jest.fn();
  await render(
    wrap(
      <UI.FieldSet disabled>
        <UI.Field>
          <UI.Input testID="blocked-input" />
          <UI.Checkbox testID="blocked-check" onCheckedChange={changed} />
          <UI.Switch testID="blocked-switch" onCheckedChange={changed} />
          <UI.RadioGroup defaultValue="one" onValueChange={changed}>
            <UI.RadioGroupItem testID="blocked-radio" value="two">
              Two
            </UI.RadioGroupItem>
          </UI.RadioGroup>
          <UI.Slider defaultValue={[50]} onValueChange={changed} />
          <UI.InputOTP onChange={changed} />
          <UI.Button testID="blocked-button" onPress={changed}>
            Blocked action
          </UI.Button>
        </UI.Field>
      </UI.FieldSet>,
    ),
  );
  expect(screen.getByTestId('blocked-input').props.editable).toBe(false);
  for (const id of ['blocked-check', 'blocked-switch', 'blocked-radio', 'blocked-button'])
    expect(screen.getByTestId(id)).toBeDisabled();
  expect(screen.getByRole('adjustable').props.accessibilityActions).toEqual([]);
  await fireEvent.press(screen.getByTestId('blocked-check'));
  await fireEvent.press(screen.getByTestId('blocked-radio'));
  await fireEvent.press(screen.getByTestId('blocked-button'));
  await fireEvent(screen.getByTestId('blocked-switch'), 'valueChange', true);
  expect(changed).not.toHaveBeenCalled();
});
test('Field description edge spacing follows visible FieldError output and source choice offsets', async () => {
  const tree = (invalid: boolean) =>
    wrap(
      <UI.Field orientation="horizontal">
        <UI.Checkbox testID="choice-offset" />
        <UI.FieldContent>
          <UI.FieldDescription testID="edge">Description</UI.FieldDescription>
          <UI.FieldError errors={invalid ? [{ message: 'Required' }] : []} />
        </UI.FieldContent>
      </UI.Field>,
    );
  const mounted = await render(tree(false));
  expect(screen.getByTestId('edge')).toHaveStyle({ marginTop: 0 });
  expect(screen.getByTestId('choice-offset')).toHaveStyle({ marginTop: 1 });
  await mounted.rerender(tree(true));
  expect(screen.getByTestId('edge')).toHaveStyle({ marginTop: -4 });
  expect(screen.getByRole('alert')).toHaveTextContent('Required');
});
test('Field authored numeric OTP companion rejects a whole invalid edit, permits clearing and retains native invalid slot paint', async () => {
  const { REGEXP_ONLY_DIGITS } = require('./.generated/src/native/registry-input-otp'),
    changed = jest.fn();
  await render(
    wrap(
      <UI.Field invalid>
        <UI.FieldLabel>Verification</UI.FieldLabel>
        <UI.InputOTP maxLength={3} pattern={REGEXP_ONLY_DIGITS} onChange={changed}>
          <UI.InputOTPGroup>
            <UI.InputOTPSlot index={0} invalid />
            <UI.InputOTPSlot index={1} />
            <UI.InputOTPSlot index={2} />
          </UI.InputOTPGroup>
        </UI.InputOTP>
      </UI.Field>,
    ),
  );
  const input = screen.getByLabelText('One-time code');
  await fireEvent.changeText(input, '12a');
  expect(changed).not.toHaveBeenCalled();
  await fireEvent.changeText(input, '123');
  expect(changed).toHaveBeenLastCalledWith('123');
  await fireEvent.changeText(input, '');
  expect(changed).toHaveBeenLastCalledWith('');
});
test('fieldset control blocking and choice-card bindings stop at a physical portal boundary', async () => {
  const changed = jest.fn();
  await render(
    wrap(
      <UI.FieldSet disabled>
        <UI.Input testID="fieldset-control" />
        <NativePhysicalPortalBoundary>
          <UI.Input testID="portal-control" />
          <UI.Button testID="portal-action" onPress={changed}>
            Portal action
          </UI.Button>
        </NativePhysicalPortalBoundary>
      </UI.FieldSet>,
    ),
  );
  expect(screen.getByTestId('fieldset-control').props.editable).toBe(false);
  expect(screen.getByTestId('portal-control').props.editable).not.toBe(false);
  expect(screen.getByTestId('portal-action')).toBeEnabled();
  await fireEvent.press(screen.getByTestId('portal-action'));
  expect(changed).toHaveBeenCalledTimes(1);
});
test('a portaled checkbox cannot replace its ancestor choice-card activation target', async () => {
  function Example() {
    const [outer, setOuter] = useState(false),
      [inner, setInner] = useState(false);
    return (
      <UI.FieldLabel testID="physical-card">
        <UI.Field>
          <UI.Checkbox testID="physical-choice" checked={outer} onCheckedChange={setOuter} />
          <UI.FieldTitle>Physical choice</UI.FieldTitle>
        </UI.Field>
        <NativePhysicalPortalBoundary>
          <UI.Field>
            <UI.Checkbox testID="portaled-choice" checked={inner} onCheckedChange={setInner} />
            <UI.FieldTitle>Separate surface</UI.FieldTitle>
          </UI.Field>
        </NativePhysicalPortalBoundary>
      </UI.FieldLabel>
    );
  }
  await render(wrap(<Example />));
  await fireEvent.press(screen.getByTestId('physical-card'));
  expect(screen.getByTestId('physical-choice').props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId('portaled-choice').props.accessibilityState.checked).toBe(false);
});
