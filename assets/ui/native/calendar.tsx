import { useState } from 'react';
import { View, type ViewProps } from 'react-native';
import { Box, LabelText, row, useControllable } from './_core';
import { Button } from './button';
export type DateRange = { from?: Date; to?: Date };
type Common = ViewProps & {
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  disabled?: (date: Date) => boolean;
  fromDate?: Date;
  toDate?: Date;
  locale?: string;
  weekStartsOn?: number;
  showOutsideDays?: boolean;
};
export type CalendarProps = Common &
  (
    | { mode?: 'single'; selected?: Date; onSelect?: (date: Date | undefined) => void }
    | { mode: 'multiple'; selected?: Date[]; onSelect?: (dates: Date[]) => void }
    | { mode: 'range'; selected?: DateRange; onSelect?: (range: DateRange) => void }
  );
const dayKey = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
export function Calendar(props: CalendarProps) {
  const {
    month,
    defaultMonth = new Date(),
    onMonthChange,
    disabled,
    fromDate,
    toDate,
    locale,
    weekStartsOn = 0,
    showOutsideDays = true,
    style,
    ...view
  } = props;
  const [visible, setVisible] = useControllable(month, defaultMonth, onMonthChange);
  const [internal, setInternal] = useState<Date | Date[] | DateRange | undefined>();
  const controlled = Object.prototype.hasOwnProperty.call(props, 'selected');
  const selected = controlled ? props.selected : internal;
  const start = new Date(visible.getFullYear(), visible.getMonth(), 1);
  const weekStart = ((Math.trunc(weekStartsOn) % 7) + 7) % 7;
  const offset = (start.getDay() - weekStart + 7) % 7;
  const count =
    Math.ceil((offset + new Date(visible.getFullYear(), visible.getMonth() + 1, 0).getDate()) / 7) *
    7;
  const same = (date: Date, other?: Date) =>
    other instanceof Date && dayKey(date) === dayKey(other);
  function select(date: Date) {
    if (props.mode === 'multiple') {
      const current = Array.isArray(selected) ? selected : [];
      const next = current.some((item) => same(date, item))
        ? current.filter((item) => !same(date, item))
        : [...current, date];
      if (!controlled) setInternal(next);
      props.onSelect?.(next);
    } else if (props.mode === 'range') {
      const current =
        selected && !(selected instanceof Date) && !Array.isArray(selected) ? selected : {};
      const next =
        !current.from || current.to
          ? { from: date }
          : dayKey(date) < dayKey(current.from)
            ? { from: date, to: current.from }
            : { from: current.from, to: date };
      if (!controlled) setInternal(next);
      props.onSelect?.(next);
    } else {
      const next = selected instanceof Date && same(date, selected) ? undefined : date;
      if (!controlled) setInternal(next);
      props.onSelect?.(next);
    }
  }
  const blocked = (date: Date) =>
    !!disabled?.(date) ||
    (!!fromDate && dayKey(date) < dayKey(fromDate)) ||
    (!!toDate && dayKey(date) > dayKey(toDate));
  function highlighted(date: Date) {
    if (selected instanceof Date) return same(date, selected);
    if (Array.isArray(selected)) return selected.some((item) => same(date, item));
    return (
      !!selected?.from &&
      dayKey(date) >= dayKey(selected.from) &&
      dayKey(date) <= dayKey(selected.to ?? selected.from)
    );
  }
  const previous = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  // Selection props belong to Calendar, never to the native host view.
  const host: ViewProps = { ...view };
  delete (host as Partial<CalendarProps>).selected;
  delete (host as Partial<CalendarProps>).onSelect;
  delete (host as Partial<CalendarProps>).mode;
  return (
    <Box {...host} style={style}>
      <View style={row({ justifyContent: 'space-between' })}>
        <Button
          nativePreset={false}
          variant="ghost"
          accessibilityLabel="Previous month"
          disabled={
            !!fromDate &&
            new Date(previous.getFullYear(), previous.getMonth() + 1, 0).getTime() <
              dayKey(fromDate)
          }
          onPress={() => setVisible(previous)}
        >
          ‹
        </Button>
        <LabelText accessibilityRole="header" accessibilityLiveRegion="polite">
          {start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </LabelText>
        <Button
          nativePreset={false}
          variant="ghost"
          accessibilityLabel="Next month"
          disabled={!!toDate && dayKey(next) > dayKey(toDate)}
          onPress={() => setVisible(next)}
        >
          ›
        </Button>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: 7 }, (_, index) => (
          <LabelText key={index} style={{ width: `${100 / 7}%`, textAlign: 'center' }}>
            {new Date(2026, 0, 4 + weekStart + index).toLocaleDateString(locale, {
              weekday: 'short',
            })}
          </LabelText>
        ))}
      </View>
      {Array.from({ length: count / 7 }, (_, week) => (
        <View key={week} style={{ flexDirection: 'row' }}>
          {Array.from({ length: 7 }, (_, column) => {
            const date = new Date(
              start.getFullYear(),
              start.getMonth(),
              week * 7 + column - offset + 1,
            );
            const outside = date.getMonth() !== start.getMonth();
            return (
              <View key={column} style={{ width: `${100 / 7}%` }}>
                {outside && !showOutsideDays ? (
                  <View style={{ minHeight: 44 }} />
                ) : (
                  <Button
                    nativePreset={false}
                    size="icon"
                    variant={highlighted(date) ? 'secondary' : 'ghost'}
                    disabled={blocked(date)}
                    accessibilityLabel={date.toLocaleDateString(locale, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    accessibilityState={{ selected: highlighted(date), disabled: blocked(date) }}
                    onPress={() => select(date)}
                    style={{ opacity: outside ? 0.5 : 1, minWidth: 0, paddingHorizontal: 0 }}
                  >
                    {date.getDate()}
                  </Button>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </Box>
  );
}

export function RangeCalendar(
  props: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect'> & {
    selected?: DateRange;
    onSelect?: (value: DateRange) => void;
  },
) {
  return <Calendar {...props} mode="range" />;
}
export function CalendarDayButton({
  day,
  modifiers,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & {
  day: Date | { date: Date };
  modifiers?: { selected?: boolean; disabled?: boolean; today?: boolean };
  children?: React.ReactNode;
}) {
  const date = day instanceof Date ? day : day.date;
  return (
    <Button
      nativePreset={false}
      size="icon"
      variant={modifiers?.selected ? 'secondary' : 'ghost'}
      {...props}
      disabled={props.disabled || modifiers?.disabled}
      accessibilityLabel={
        props.accessibilityLabel ??
        date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      }
      accessibilityState={{
        selected: !!modifiers?.selected,
        disabled: !!(props.disabled || modifiers?.disabled),
      }}
    >
      {children ?? date.getDate()}
    </Button>
  );
}
