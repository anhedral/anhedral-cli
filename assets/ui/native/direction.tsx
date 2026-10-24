import { createContext, useContext, type ReactNode } from 'react';
import { DirectionProvider, useDirection } from './_core';
export { DirectionProvider, useDirection };
const Locale = createContext('en-US');
export function I18nProvider({
  locale = Intl.DateTimeFormat().resolvedOptions().locale,
  children,
}: {
  locale?: string;
  children?: ReactNode;
}) {
  const canonical = Intl.getCanonicalLocales(locale)[0] ?? 'en-US';
  const language = canonical.toLowerCase().split('-')[0] ?? 'en';
  const dir = /-Latn(?:-|$)/.test(canonical)
    ? 'ltr'
    : /-(?:Arab|Hebr|Thaa|Adlm)(?:-|$)/.test(canonical) ||
        ['ar', 'fa', 'he', 'ur', 'ps', 'yi', 'dv', 'sd'].includes(language)
      ? 'rtl'
      : 'ltr';
  return (
    <Locale.Provider value={locale}>
      <DirectionProvider dir={dir}>{children}</DirectionProvider>
    </Locale.Provider>
  );
}
export function useLocale() {
  return { locale: useContext(Locale), direction: useDirection() };
}
