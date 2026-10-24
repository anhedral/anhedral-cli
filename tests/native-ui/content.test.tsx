import React from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as UI from './.generated';
import { tokenizeCode } from './.generated/src/native/code-block';
const mount = (element: React.ReactElement) =>
  render(<UI.ThemeProvider>{element}</UI.ThemeProvider>);
test.each(['typescript', 'javascript', 'json', 'shell', 'python', 'diff'])(
  'code lexer preserves exact %s source bytes and highlights tokens',
  (language) => {
    const code =
      language === 'diff'
        ? '@@ -1 +1 @@\n-const old = 1;\n+const next = 2;\n'
        : 'const value = "<script>safe</script>";\n// comment\n42';
    const tokens = tokenizeCode(code, language);
    expect(tokens.map((token) => token.text).join('')).toBe(code);
    expect(tokens.some((token) => token.kind !== 'plain')).toBe(true);
    if (language === 'diff') {
      expect(tokens.some((token) => token.kind === 'added')).toBe(true);
      expect(tokens.some((token) => token.kind === 'removed')).toBe(true);
    }
  },
);
test('code copy uses the clipboard bridge and retains source text verbatim', async () => {
  const code = 'const value = "<script>";';
  await mount(
    <UI.CodeBlock code={code}>
      <UI.CodeBlockContent />
      <UI.CodeBlockCopyButton />
    </UI.CodeBlock>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Copy code' }));
  expect(Clipboard.setStringAsync).toHaveBeenCalledWith(code);
});
test.each(['bar', 'line', 'area', 'pie', 'radar', 'radial'] as const)(
  '%s chart renders native SVG and exposes selectable data without browser imports',
  async (type) => {
    const select = jest.fn();
    await mount(
      <UI.Chart
        type={type}
        data={[
          { label: 'Alpha', value: 4 },
          { label: 'Beta', value: 8 },
        ]}
        onValueChange={select}
      />,
    );
    await userEvent.press(screen.getByRole('button', { name: 'Beta: 8' }));
    expect(select).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'Beta: 8' }).props.accessibilityState.selected).toBe(
      true,
    );
  },
);
test('charts handle empty, all-zero and nonfinite series without invalid SVG geometry', async () => {
  const result = await mount(<UI.Chart data={[]} />);
  expect(screen.getByText('No chart data')).toBeOnTheScreen();
  await result.rerender(
    <UI.ThemeProvider>
      <UI.Chart type="pie" data={[{ label: 'Empty', value: NaN }]} />
    </UI.ThemeProvider>,
  );
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/NaN|Infinity/);
  expect(screen.getByRole('button', { name: 'Empty: 0' })).toBeOnTheScreen();
});
test('questionnaire validates required steps, retains back navigation, supports multi-choice and submits once', async () => {
  const complete = jest.fn();
  await mount(
    <UI.Questionnaire
      questions={[
        { id: 'name', title: 'Name', type: 'text' },
        {
          id: 'choice',
          title: 'Choose',
          type: 'multiple',
          options: [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ],
        },
      ]}
      onComplete={complete}
    />,
  );
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Name'), 'Sam');
  await userEvent.press(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  await userEvent.press(screen.getByRole('checkbox', { name: 'Alpha' }));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByLabelText('Name')).toHaveProp('value', 'Sam');
  await userEvent.press(screen.getByRole('button', { name: 'Next' }));
  await userEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(complete).toHaveBeenCalledWith({ name: 'Sam', choice: ['a'] });
  await userEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(complete).toHaveBeenCalledTimes(1);
});
test('optional questionnaire skip omits a stale answer and single-choice blocks disabled options', async () => {
  const complete = jest.fn();
  await mount(
    <UI.Questionnaire
      defaultAnswers={{ choice: 'a' }}
      questions={[
        {
          id: 'choice',
          title: 'Choose',
          type: 'single',
          optional: true,
          options: [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Disabled', disabled: true },
          ],
        },
      ]}
      onComplete={complete}
    />,
  );
  await userEvent.press(screen.getByRole('radio', { name: 'Disabled' }));
  await userEvent.press(screen.getByRole('button', { name: 'Skip' }));
  expect(complete).toHaveBeenCalledWith({});
});
test('trace disclosures preserve highlighted detail and expose run status', async () => {
  await mount(
    <UI.Trace>
      <UI.TraceItem>
        <UI.TraceTrigger>Run test</UI.TraceTrigger>
        <UI.TraceContent>
          <UI.TraceStatus status="complete" />
          <UI.TraceCode code="+passed\n-failed" language="diff" />
        </UI.TraceContent>
      </UI.TraceItem>
    </UI.Trace>,
  );
  expect(screen.queryByText('complete')).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Run test' }));
  expect(screen.getByText('complete')).toBeOnTheScreen();
});
