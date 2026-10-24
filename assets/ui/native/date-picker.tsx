import { useState } from 'react';
import { Calendar, type CalendarProps } from './calendar';
import { OverlayRoot, OverlayTrigger, OverlayContent } from './_overlay';
import { useControllable } from './_core';
export function DatePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Pick a date',
  disabled = false,
  disabledDates,
  ...calendar
}: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect' | 'disabled'> & {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
}) {
  const [selected, set] = useControllable<Date | undefined>(value, defaultValue, onValueChange);
  const [open, setOpen] = useState(false);
  return (
    <OverlayRoot open={open} onOpenChange={setOpen}>
      <OverlayTrigger disabled={disabled} variant="outline" accessibilityLabel="Choose date">
        {selected?.toLocaleDateString(calendar.locale) ?? placeholder}
      </OverlayTrigger>
      <OverlayContent>
        <Calendar
          {...calendar}
          disabled={disabledDates}
          mode="single"
          selected={selected}
          defaultMonth={selected ?? calendar.defaultMonth}
          onSelect={(date) => {
            set(date);
            setOpen(false);
          }}
        />
      </OverlayContent>
    </OverlayRoot>
  );
}
