import type { ComponentProps } from 'react';
import { Slider as NativeSlider } from './_motion';
type Base = Omit<
  ComponentProps<typeof NativeSlider>,
  'value' | 'defaultValue' | 'onValueChange' | 'onValueCommit'
>;
type Scalar = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
};
type Range = {
  value?: readonly number[];
  defaultValue?: readonly number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
};
type Props = Base & (Scalar | Range);
/** Preserve the source base's scalar/range value shape while sharing native geometry. */
export function Slider({ value, defaultValue, onValueChange, onValueCommit, ...props }: Props) {
  const scalar = typeof (value ?? defaultValue ?? 0) === 'number';
  const array = (value: number | readonly number[] | undefined) =>
    value === undefined ? undefined : typeof value === 'number' ? [value] : [...value];
  const emit = (handler: Scalar['onValueChange'] | Range['onValueChange'], value: number[]) => {
    if (scalar) (handler as Scalar['onValueChange'])?.(value[0]!);
    else (handler as Range['onValueChange'])?.(value);
  };
  return (
    <NativeSlider
      {...props}
      value={array(value)}
      defaultValue={array(defaultValue)}
      onValueChange={(value) => emit(onValueChange, value)}
      onValueCommit={(value) => emit(onValueCommit, value)}
    />
  );
}
export function AriaSlider(props: Props) {
  return <Slider {...props} />;
}
