import { useState } from 'react';
import { Box, LabelText, Muted, row } from './_core';
import { Button } from './button';
import { Input } from './input';
import { Checkbox, RadioGroup, RadioGroupItem } from './_controls';
export type Question = {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'multiple' | 'text';
  options?: { value: string; label: string; disabled?: boolean }[];
  optional?: boolean;
  placeholder?: string;
};
export type QuestionnaireAnswers = Record<string, string | string[]>;
export function Questionnaire({
  questions,
  onComplete,
  defaultAnswers = {},
}: {
  questions: readonly Question[];
  onComplete: (answers: QuestionnaireAnswers) => void;
  defaultAnswers?: QuestionnaireAnswers;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(defaultAnswers);
  const [complete, setComplete] = useState(false);
  const question = questions[index];
  if (!question) return <Muted>No questions</Muted>;
  const answer = answers[question.id];
  const valid =
    question.type === 'multiple'
      ? Array.isArray(answer) && answer.length > 0
      : typeof answer === 'string' && !!answer.trim();
  const update = (next: string | string[]) => {
    setComplete(false);
    setAnswers({ ...answers, [question.id]: next });
  };
  const next = () => {
    if (index === questions.length - 1) {
      if (!complete) {
        setComplete(true);
        onComplete(answers);
      }
    } else setIndex(index + 1);
  };
  return (
    <Box>
      <Muted accessibilityLiveRegion="polite">
        Question {index + 1} of {questions.length}
      </Muted>
      <LabelText accessibilityRole="header">{question.title}</LabelText>
      {question.description && <Muted>{question.description}</Muted>}
      {question.type === 'text' ? (
        <Input
          accessibilityLabel={question.title}
          placeholder={question.placeholder}
          value={typeof answer === 'string' ? answer : ''}
          onChangeText={update}
        />
      ) : question.type === 'single' ? (
        <RadioGroup
          accessibilityLabel={question.title}
          value={typeof answer === 'string' ? answer : ''}
          onValueChange={update}
        >
          {question.options?.map((option) => (
            <RadioGroupItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </RadioGroupItem>
          ))}
        </RadioGroup>
      ) : (
        <Box>
          {question.options?.map((option) => (
            <Checkbox
              key={option.value}
              disabled={option.disabled}
              accessibilityLabel={option.label}
              checked={Array.isArray(answer) && answer.includes(option.value)}
              onCheckedChange={(checked) => {
                const current = Array.isArray(answer) ? answer : [];
                update(
                  checked
                    ? [...current, option.value]
                    : current.filter((value) => value !== option.value),
                );
              }}
            >
              {option.label}
            </Checkbox>
          ))}
        </Box>
      )}
      <Box style={row()}>
        <Button
          variant="outline"
          disabled={index === 0}
          onPress={() => {
            setComplete(false);
            setIndex(index - 1);
          }}
        >
          Back
        </Button>
        {question.optional && (
          <Button
            variant="ghost"
            disabled={complete}
            onPress={() => {
              const cleared = { ...answers };
              delete cleared[question.id];
              setAnswers(cleared);
              if (index === questions.length - 1) {
                setComplete(true);
                onComplete(cleared);
              } else setIndex(index + 1);
            }}
          >
            Skip
          </Button>
        )}
        <Button disabled={(!valid && !question.optional) || complete} onPress={next}>
          {index === questions.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </Box>
      {complete && <Muted accessibilityLiveRegion="polite">Responses submitted</Muted>}
    </Box>
  );
}
