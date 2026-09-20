import { describe, expect, it } from "vitest";
import { detectLang, resolveLang, translate } from "./index";
import { en } from "./en";
import { nl } from "./nl";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b));

describe("i18n", () => {
  it("detects Dutch from navigator.language, falls back to English", () => {
    expect(detectLang("nl-NL")).toBe("nl");
    expect(detectLang("NL")).toBe("nl");
    expect(detectLang("en-GB")).toBe("en");
    expect(detectLang("fr")).toBe("en");
    expect(detectLang(undefined)).toBe("en");
  });

  it("resolves the language setting", () => {
    expect(resolveLang("auto", "nl-BE")).toBe("nl");
    expect(resolveLang("en", "nl-BE")).toBe("en");
    expect(resolveLang("nl", "en-US")).toBe("nl");
  });

  it("has a non-empty Dutch string for every English key, and no extras", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) expect(nl[key], key).toBeTruthy();
    expect(Object.keys(nl).sort((a, b) => a.localeCompare(b))).toEqual(Object.keys(en).sort((a, b) => a.localeCompare(b)));
  });

  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(nl[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it("translates and interpolates", () => {
    expect(translate("nl", "menu.play")).toBe("Spelen");
    expect(translate("en", "menu.play")).toBe("Play");
    expect(translate("en", "game.hintIn", { s: 12 })).toBe("Hint in 12s");
    expect(translate("nl", "hint.overlapSingle", { line: "Rij 3", len: 7, size: 10, count: 4 })).toContain("middelste 4");
    expect(translate("en", "game.hintIn")).toBe("Hint in {s}s"); // missing params stay visible
  });
});
