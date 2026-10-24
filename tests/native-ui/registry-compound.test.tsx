import React from 'react';
import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import * as UI from './.generated';
const mount = (node: React.ReactNode) => render(<UI.ThemeProvider>{node}</UI.ThemeProvider>);
test.each(['idle', 'uploading', 'processing', 'error', 'done'] as const)(
  'compound native attachments render %s state with functioning actions',
  async (state) => {
    const remove = jest.fn();
    await mount(
      <UI.Attachment state={state} testID="attachment" size="sm" orientation="vertical">
        <UI.AttachmentMedia>PDF</UI.AttachmentMedia>
        <UI.AttachmentContent>
          <UI.AttachmentTitle>Report</UI.AttachmentTitle>
          <UI.AttachmentDescription>2 MB</UI.AttachmentDescription>
        </UI.AttachmentContent>
        <UI.AttachmentActions>
          <UI.AttachmentAction accessibilityLabel="Remove report" onPress={remove}>
            Remove
          </UI.AttachmentAction>
        </UI.AttachmentActions>
      </UI.Attachment>,
    );
    expect(screen.getByTestId('attachment')).toHaveStyle({
      flexDirection: 'column',
      borderStyle: state === 'idle' ? 'dashed' : 'solid',
    });
    expect(screen.getByText('Report')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove report' }));
    expect(remove).toHaveBeenCalledTimes(1);
  },
);
test.each(['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const)(
  'compound native bubbles preserve text and actions for %s',
  async (variant) => {
    const react = jest.fn();
    await mount(
      <UI.BubbleGroup>
        <UI.Bubble variant={variant} align="end" testID="bubble">
          <UI.BubbleContent>Response</UI.BubbleContent>
          <UI.BubbleReactions side="top" align="start" testID="reactions">
            <UI.Button accessibilityLabel="React" onPress={react}>
              Like
            </UI.Button>
          </UI.BubbleReactions>
        </UI.Bubble>
      </UI.BubbleGroup>,
    );
    expect(screen.getByTestId('bubble')).toHaveStyle({ alignSelf: 'flex-end' });
    expect(screen.getByTestId('reactions')).toHaveStyle({ top: -12, start: 0 });
    await fireEvent.press(screen.getByRole('button', { name: 'React' }));
    expect(react).toHaveBeenCalledTimes(1);
  },
);
test('trace registry parts expose error status and native collapsible interaction', async () => {
  await mount(
    <UI.Trace>
      <UI.TraceCollapsible>
        <UI.TraceCollapsibleTrigger>Tool details</UI.TraceCollapsibleTrigger>
        <UI.TraceCollapsibleContent>
          <UI.TraceLine status="error">
            <UI.TraceIcon>!</UI.TraceIcon>
            <UI.TraceTitle>Failed</UI.TraceTitle>
            <UI.TraceDescription>Retry later</UI.TraceDescription>
          </UI.TraceLine>
        </UI.TraceCollapsibleContent>
      </UI.TraceCollapsible>
    </UI.Trace>,
  );
  expect(screen.queryByText('Failed')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Tool details' }));
  expect(screen.getByText('Failed')).toBeOnTheScreen();
  expect(screen.getByText('Retry later')).toBeOnTheScreen();
});
test('compound code blocks support numbered lines, variants and explicit copy values', async () => {
  const copy = jest.fn();
  await mount(
    <UI.CodeBlock variant="destructive" size="sm">
      <UI.CodeBlockHeader>
        <UI.CodeBlockTitle>Patch</UI.CodeBlockTitle>
        <UI.CodeBlockActions>
          <UI.CodeBlockCopyButton value={'original\n'} onCopy={copy} />
        </UI.CodeBlockActions>
      </UI.CodeBlockHeader>
      <UI.CodeBlockContent lineNumbers startLine={4} wrap>
        <UI.CodeBlockLine variant="removed">old</UI.CodeBlockLine>
        <UI.CodeBlockLine variant="added">new</UI.CodeBlockLine>
      </UI.CodeBlockContent>
      <UI.CodeBlockFooter>2 lines</UI.CodeBlockFooter>
    </UI.CodeBlock>,
  );
  expect(screen.getByText('4', { includeHiddenElements: true })).toBeOnTheScreen();
  expect(screen.getByText('5', { includeHiddenElements: true })).toBeOnTheScreen();
  await userEvent.press(screen.getByRole('button', { name: 'Copy code' }));
  expect(copy).toHaveBeenCalledWith('original\n');
});
function Questions({
  onSubmit,
}: {
  onSubmit: (answers: UI.QuestionnaireAnswers) => void | Promise<void>;
}) {
  return (
    <UI.Questionnaire onSubmit={onSubmit}>
      <UI.QuestionnaireProgress />
      <UI.QuestionnaireItem name="choice" required>
        <UI.QuestionnaireTitle>Direction</UI.QuestionnaireTitle>
        <UI.QuestionnaireChoices>
          <UI.QuestionnaireChoice value="native">
            <UI.QuestionnaireChoiceInput />
            <UI.QuestionnaireChoiceLabel>Native</UI.QuestionnaireChoiceLabel>
            <UI.QuestionnaireChoiceShortcut />
          </UI.QuestionnaireChoice>
          <UI.QuestionnaireChoice disabled value="disabled">
            Unavailable
          </UI.QuestionnaireChoice>
        </UI.QuestionnaireChoices>
        <UI.QuestionnaireError />
      </UI.QuestionnaireItem>
      <UI.QuestionnaireItem name="tags" multiple>
        <UI.QuestionnaireTitle>Tags</UI.QuestionnaireTitle>
        <UI.QuestionnaireChoices>
          <UI.QuestionnaireChoice value="one">One</UI.QuestionnaireChoice>
          <UI.QuestionnaireChoice value="two">Two</UI.QuestionnaireChoice>
        </UI.QuestionnaireChoices>
        <UI.QuestionnaireInput accessibilityLabel="Other tag" />
      </UI.QuestionnaireItem>
      <UI.QuestionnaireItem name="detail">
        <UI.QuestionnaireTitle>Detail</UI.QuestionnaireTitle>
        <UI.QuestionnaireInput accessibilityLabel="Detail" />
      </UI.QuestionnaireItem>
      <UI.QuestionnaireActions>
        <UI.QuestionnairePrevious />
        <UI.QuestionnaireSkip />
        <UI.QuestionnaireNext />
        <UI.QuestionnaireSubmit />
      </UI.QuestionnaireActions>
    </UI.Questionnaire>
  );
}
test('compound questionnaire validates required steps, preserves multiple/free answers and submits once', async () => {
  const submit = jest.fn();
  await mount(<Questions onSubmit={submit} />);
  expect(screen.getByText('Question 1 of 3')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('alert')).toHaveTextContent('This question requires an answer.');
  expect(screen.getByRole('radio', { name: 'Unavailable' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('radio', { name: 'Native' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'One' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Two' }));
  await userEvent.type(screen.getByLabelText('Other tag'), 'custom');
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('radio', { name: 'Native' })).toBeChecked();
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('checkbox', { name: 'One' })).toBeChecked();
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await userEvent.type(screen.getByLabelText('Detail'), 'Context');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).toHaveBeenCalledWith({
    choice: 'native',
    tags: ['one', 'two', 'custom'],
    detail: 'Context',
  });
  expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
});
test('skipping the last optional questionnaire item submits the remaining answers', async () => {
  const submit = jest.fn();
  await mount(<Questions onSubmit={submit} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Native' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
  expect(submit).toHaveBeenCalledWith({ choice: 'native' });
});
test('failed questionnaire submission retains answers and enables an explicit retry', async () => {
  const submit = jest.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(undefined);
  await mount(<Questions onSubmit={submit} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Native' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to submit. Try again.');
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).toHaveBeenCalledTimes(2);
});
test('questionnaire collection metadata supplies required validation even if the item omits the prop', async () => {
  const submit = jest.fn();
  await mount(
    <UI.Questionnaire items={[{ name: 'email', required: true }]} onSubmit={submit}>
      <UI.QuestionnaireItem name="email">
        <UI.QuestionnaireInput accessibilityLabel="Email" />
        <UI.QuestionnaireError />
      </UI.QuestionnaireItem>
      <UI.QuestionnaireSubmit />
    </UI.Questionnaire>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeOnTheScreen();
});
test('sidebar rail closes the panel and the native registry input accepts text', async () => {
  await mount(
    <UI.SidebarProvider defaultOpen>
      <UI.SidebarTrigger />
      <UI.Sidebar side="right">
        <UI.SidebarHeader>
          <UI.SidebarInput accessibilityLabel="Search navigation" />
        </UI.SidebarHeader>
        <UI.SidebarRail />
      </UI.Sidebar>
    </UI.SidebarProvider>,
  );
  await userEvent.type(screen.getByLabelText('Search navigation'), 'Search');
  expect(screen.getByDisplayValue('Search')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(screen.queryByLabelText('Search navigation')).toBeNull();
});
