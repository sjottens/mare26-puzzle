// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { COOKIE_PREFIX, CookieStorageAdapter } from "./cookies";
import { SaveManager } from "./manager";
import { createDefaultSave } from "./schema";

function wipe() {
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

describe("CookieStorageAdapter on the real document.cookie (jsdom)", () => {
  afterEach(wipe);

  it("saves and loads a game through actual cookies", async () => {
    const adapter = new CookieStorageAdapter();
    const m = new SaveManager(adapter, {}, 0);
    await m.load();
    const s = createDefaultSave();
    s.puzzles["animals-01"] = [1, 77, 3];
    m.set(s);
    await m.flush();
    expect(document.cookie).toContain(`${COOKIE_PREFIX}0=`);

    const fresh = new SaveManager(new CookieStorageAdapter());
    expect((await fresh.load()).puzzles["animals-01"]).toEqual([1, 77, 3]);
    expect(fresh.status).toBe("ok");
  });

  it("flushes through real window/document events", async () => {
    const m = new SaveManager(new CookieStorageAdapter());
    const off = m.attachLifecycle(window, document);
    const s = createDefaultSave();
    s.stats.endlessSolved = 9;
    m.set(s);
    window.dispatchEvent(new Event("pagehide"));
    await Promise.resolve();
    expect(document.cookie).toContain(`${COOKIE_PREFIX}0=`);
    off();
  });
});
