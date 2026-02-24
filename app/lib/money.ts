import type { Lang, Money } from "./types";

export function formatMoney(money: Money, lang: Lang) {
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currencyCode,
    maximumFractionDigits: 2,
  }).format(money.amount);
}
