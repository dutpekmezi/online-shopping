export function LocaleCurrencyPicker({ lang }: { lang: string }) {
  return <div className="text-xs text-gray-500">Locale: {lang.toUpperCase()} / TRY</div>;
}
