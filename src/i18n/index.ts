import { en, type MessageKey } from "./en";
import { nl } from "./nl";

export type Lang = "nl" | "en";
export type { MessageKey };
export type Params = Record<string, string | number>;

const dictionaries: Record<Lang, Record<MessageKey, string>> = { en, nl };

/** Default language from navigator.language: Dutch for nl*, English otherwise. */
export function detectLang(navigatorLanguage: string | undefined): Lang {
  return navigatorLanguage?.toLowerCase().startsWith("nl") ? "nl" : "en";
}

/** The language setting is "auto" (follow the browser) or an explicit choice. */
export function resolveLang(setting: "auto" | Lang, navigatorLanguage: string | undefined): Lang {
  return setting === "auto" ? detectLang(navigatorLanguage) : setting;
}

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const template = dictionaries[lang][key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export type TFn = (key: MessageKey, params?: Params) => string;
