import type { Lang } from "./types";

export const SUPPORTED_LANGS: Lang[] = ["tr", "en"];

export function isValidLang(value: string): value is Lang {
  return SUPPORTED_LANGS.includes(value as Lang);
}

export function detectLangFromRequest(request: Request): Lang {
  const header = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return header.includes("en") ? "en" : "tr";
}
