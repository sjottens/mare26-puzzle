import { describe, expect, it, vi } from "vitest";
import { packCells, unpackCells } from "./bitset";
import { CHUNK_SIZE, COOKIE_PREFIX, CookieStorageAdapter, HARD_LIMIT, joinChunks, MAX_AGE_SECONDS, SOFT_LIMIT, splitPayload } from "./cookies";
import { FakeJar } from "./fakejar";
import { SaveManager } from "./manager";
import { migrateRaw, normalizeSave } from "./migrate";
import { createDefaultSave, SCHEMA_VERSION, type SaveData } from "./schema";
import { checksum, decodePayload, encodePayload, exportSaveCode, importSaveCode } from "./wire";

/** A save that looks like a heavily-played game. */
function bigSave(): SaveData {
  const s = createDefaultSave();
  const packs = ["tutorial", "dutch-icons", "animals", "food", "sea", "space", "retro-toys"];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (const p of packs) {
    for (let i = 1; i <= 20; i++) s.puzzles[`${p}-${String(i).padStart(2, "0")}`] = [1, Math.round(30 + rnd() * 900), Math.floor(rnd() * 4)];
  }
  for (let d = 1; d <= 30; d++) s.daily.days[`2026-08-${String(d).padStart(2, "0")}`] = [Math.round(60 + rnd() * 300), 1 + Math.floor(rnd() * 3)];
  s.daily.streak = 30;
  s.current = { id: "animals-07", mode: "challenge", src: "pack", day: "", cells: packCells(Array.from({ length: 400 }, () => Math.floor(rnd() * 3))), time: 321, hearts: 2, hintClock: 40, hintsUsed: 3, mistakes: 1 };
  s.stats = { playTime: 123456, hintsUsed: 44, endlessSolved: 17 };
  s.settings.lang = "nl";
  s.settings.music = true;
  return s;
}

const randomString = (n: number, alphabet = "abcdefghijklmnopqrstuvwxyz0123456789") => {
  let seed = 42;
  let out = "";
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out += alphabet[seed % alphabet.length];
  }
  return out;
};

describe("board bitset", () => {
  it("round-trips every length and state combination", () => {
    for (const n of [1, 2, 3, 4, 5, 9, 25, 100, 225, 400]) {
      const cells = Uint8Array.from({ length: n }, (_, i) => (i * 7 + (i >> 2)) % 3);
      const packed = packCells(cells);
      expect(unpackCells(packed, n), `n=${n}`).toEqual(cells);
    }
  });

  it("is compact (20x20 in 134 chars) and rejects malformed input", () => {
    expect(packCells(new Uint8Array(400)).length).toBe(134);
    expect(unpackCells("!!!!", 4)).toBeNull();
    expect(unpackCells(packCells(new Uint8Array(25)), 100)).toBeNull(); // wrong length
    expect(unpackCells("_", 4)).toBeNull();
  });
});

describe("payload encoding", () => {
  it("round-trips a save and stays far below the size budget", () => {
    const save = bigSave();
    const payload = encodePayload(save);
    expect(decodePayload(payload)).toEqual(save);
    expect(payload.length).toBeLessThan(SOFT_LIMIT / 2);
  });

  it("uses only cookie-safe characters", () => {
    expect(encodePayload(bigSave())).toMatch(/^[A-Za-z0-9+\-$]+$/);
  });

  it("detects any single-character corruption via the checksum", () => {
    const payload = encodePayload(bigSave());
    for (const pos of [0, 5, 8, 9, 50, Math.floor(payload.length / 2), payload.length - 1]) {
      const flipped = payload.slice(0, pos) + (payload[pos] === "A" ? "B" : "A") + payload.slice(pos + 1);
      expect(decodePayload(flipped), `pos ${pos}`).toBeNull();
    }
  });

  it("returns null (not an exception) for garbage", () => {
    for (const junk of ["", "x", "12345678", "zzzzzzzzzzzzzzzz", checksum("hello") + "hello", "\u0000\u0001", "{}"]) {
      expect(decodePayload(junk)).toBeNull();
    }
  });

  it("export/import save codes round-trip and reject bad codes", () => {
    const save = bigSave();
    const code = exportSaveCode(save);
    expect(code.startsWith("M26:")).toBe(true);
    expect(importSaveCode(code)).toEqual(save);
    expect(importSaveCode(`  ${code.slice(0, 20)}\n ${code.slice(20)}  `)).toEqual(save); // whitespace from copy/paste
    expect(importSaveCode(code.slice(0, -3))).toBeNull();
    expect(importSaveCode("hello")).toBeNull();
    expect(importSaveCode(code.slice(4))).toBeNull(); // prefix missing
  });
});

describe("cookie chunking", () => {
  it("splits and rejoins payloads of every awkward size", () => {
    for (const n of [0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, CHUNK_SIZE * 3, 7000]) {
      const payload = randomString(n);
      const chunks = splitPayload(payload);
      expect(chunks.length).toBe(Math.max(1, Math.ceil(n / CHUNK_SIZE)));
      expect(joinChunks((i) => chunks[i])).toBe(payload);
    }
  });

  it("returns null when a chunk is missing or the header is bad", () => {
    const chunks = splitPayload(randomString(CHUNK_SIZE * 3));
    expect(joinChunks((i) => (i === 1 ? undefined : chunks[i]))).toBeNull();
    expect(joinChunks(() => undefined)).toBeNull();
    expect(joinChunks(() => "garbage")).toBeNull();
    expect(joinChunks(() => "999.abc")).toBeNull();
  });

  it("writes numbered cookies with the required attributes, each well under 4 KB", async () => {
    const jar = new FakeJar(true);
    const adapter = new CookieStorageAdapter(jar);
    const payload = randomString(7000);
    const res = await adapter.write(payload);
    expect(res).toEqual({ ok: true, bytes: 7000 });
    expect([...jar.cookies.keys()]).toEqual([`${COOKIE_PREFIX}0`, `${COOKIE_PREFIX}1`, `${COOKIE_PREFIX}2`]);
    for (const raw of jar.writes) {
      expect(new TextEncoder().encode(raw).length, raw.slice(0, 20)).toBeLessThan(3000);
      expect(raw).toContain("Path=/");
      expect(raw).toContain("SameSite=Lax");
      expect(raw).toContain(`Max-Age=${MAX_AGE_SECONDS}`);
      expect(raw).toContain("Secure");
    }
    expect(MAX_AGE_SECONDS).toBe(390 * 86400);
    expect(await adapter.read()).toBe(payload);
  });

  it("omits Secure on http and refreshes expiry on every save", async () => {
    const jar = new FakeJar(false);
    const adapter = new CookieStorageAdapter(jar);
    await adapter.write("abc");
    await adapter.write("abc");
    expect(jar.writes.every((w) => !w.includes("Secure"))).toBe(true);
    expect(jar.writes.filter((w) => w.includes(`Max-Age=${MAX_AGE_SECONDS}`))).toHaveLength(2);
  });

  it("removes stale chunks when the payload shrinks", async () => {
    const jar = new FakeJar();
    const adapter = new CookieStorageAdapter(jar);
    await adapter.write(randomString(7000));
    expect(jar.cookies.size).toBe(3);
    await adapter.write("small");
    expect([...jar.cookies.keys()]).toEqual([`${COOKIE_PREFIX}0`]);
    expect(await adapter.read()).toBe("small");
  });

  it("warns above the soft limit and refuses above the hard limit without touching old data", async () => {
    const jar = new FakeJar();
    const adapter = new CookieStorageAdapter(jar);
    await adapter.write("keep-me");
    expect(await adapter.write(randomString(SOFT_LIMIT + 1))).toMatchObject({ ok: true, warning: "large" });
    await adapter.write("keep-me");
    expect(await adapter.write(randomString(HARD_LIMIT + 1))).toEqual({ ok: false, error: "too-large" });
    expect(await adapter.read()).toBe("keep-me");
  });

  it("reports unavailable when cookies are blocked, and never throws", async () => {
    const jar = new FakeJar();
    jar.blocked = true;
    const adapter = new CookieStorageAdapter(jar);
    expect(await adapter.write("data")).toEqual({ ok: false, error: "unavailable" });
    expect(await adapter.read()).toBeNull();
    const throwing = new CookieStorageAdapter({ read: () => { throw new Error("denied"); }, write: () => { throw new Error("denied"); }, isSecure: () => false });
    expect(await throwing.write("x")).toEqual({ ok: false, error: "unavailable" });
    expect(await throwing.read()).toBeNull();
    await expect(throwing.clear()).resolves.toBeUndefined();
  });

  it("clear removes all chunks", async () => {
    const jar = new FakeJar();
    const adapter = new CookieStorageAdapter(jar);
    await adapter.write(randomString(5000));
    await adapter.clear();
    expect(jar.cookies.size).toBe(0);
  });
});

describe("corruption recovery", () => {
  async function savedJar(): Promise<{ jar: FakeJar; save: SaveData }> {
    const jar = new FakeJar();
    const save = bigSave();
    await new CookieStorageAdapter(jar).write(encodePayload(save));
    return { jar, save };
  }

  it("loads intact data", async () => {
    const { jar, save } = await savedJar();
    const m = new SaveManager(new CookieStorageAdapter(jar));
    expect(await m.load()).toEqual(save);
    expect(m.status).toBe("ok");
  });

  it("falls back to defaults on a flipped character", async () => {
    const { jar } = await savedJar();
    const c = jar.cookies.get(`${COOKIE_PREFIX}0`)!;
    const i = Math.floor(c.value.length / 2);
    c.value = c.value.slice(0, i) + (c.value[i] === "x" ? "y" : "x") + c.value.slice(i + 1);
    const m = new SaveManager(new CookieStorageAdapter(jar));
    expect(await m.load()).toEqual(createDefaultSave());
    expect(m.status).toBe("corrupt");
  });

  it("falls back to defaults on a truncated or missing chunk, garbage, or an empty cookie", async () => {
    for (const mutate of [
      (jar: FakeJar) => jar.cookies.delete(`${COOKIE_PREFIX}0`),
      (jar: FakeJar) => { const c = jar.cookies.get(`${COOKIE_PREFIX}0`)!; c.value = c.value.slice(0, 40); },
      (jar: FakeJar) => { jar.cookies.get(`${COOKIE_PREFIX}0`)!.value = "%%%not-a-save%%%"; },
      (jar: FakeJar) => { jar.cookies.get(`${COOKIE_PREFIX}0`)!.value = ""; },
    ]) {
      const { jar } = await savedJar();
      mutate(jar);
      const m = new SaveManager(new CookieStorageAdapter(jar));
      await expect(m.load()).resolves.toEqual(createDefaultSave());
      expect(["empty", "corrupt"]).toContain(m.status);
    }
  });

  it("recovers: after a corrupt load the next save overwrites the bad cookies", async () => {
    const { jar } = await savedJar();
    jar.cookies.get(`${COOKIE_PREFIX}0`)!.value = "junk";
    const m = new SaveManager(new CookieStorageAdapter(jar), {}, 0);
    await m.load();
    const next = createDefaultSave();
    next.stats.hintsUsed = 5;
    m.set(next);
    await m.flush();
    const again = new SaveManager(new CookieStorageAdapter(jar));
    expect((await again.load()).stats.hintsUsed).toBe(5);
    expect(again.status).toBe("ok");
  });

  it("survives an adapter that throws on read", async () => {
    const m = new SaveManager({ read: () => Promise.reject(new Error("boom")), write: async () => ({ ok: true, bytes: 0 }), clear: async () => {} });
    await expect(m.load()).resolves.toEqual(createDefaultSave());
    expect(m.status).toBe("empty");
  });

  it("starts fresh when there is no cookie at all", async () => {
    const m = new SaveManager(new CookieStorageAdapter(new FakeJar()));
    expect(await m.load()).toEqual(createDefaultSave());
    expect(m.status).toBe("empty");
  });
});

describe("migrations and normalization", () => {
  it("upgrades the v0 prototype format", () => {
    const migrated = normalizeSave({ solved: ["a-1", "a-2"], times: { "a-1": 95 }, sound: false, lang: "nl" });
    expect(migrated.v).toBe(SCHEMA_VERSION);
    expect(migrated.puzzles).toEqual({ "a-1": [1, 95, 0], "a-2": [1, 0, 0] });
    expect(migrated.settings.sound).toBe(false);
    expect(migrated.settings.lang).toBe("nl");
    expect(migrated.settings.haptics).toBe(true); // untouched defaults survive
    expect(migrateRaw({ v: 0, solved: [] }).v).toBe(1);
  });

  it("fills missing fields with defaults for older/partial saves", () => {
    const s = normalizeSave({ v: 1, settings: { sound: false } });
    expect(s).toEqual({ ...createDefaultSave(), settings: { ...createDefaultSave().settings, sound: false } });
  });

  it("drops junk and clamps out-of-range values", () => {
    const s = normalizeSave({
      v: 1,
      settings: { lang: "klingon", theme: 5, sound: "yes", autoCross: false },
      puzzles: { ok: [1, 100, 3], bad: "x", huge: [1, 1e12, 99], "": [1, 1, 1], neg: [1, -50, -2] },
      current: { id: "p", mode: "nightmare", cells: "AAAA", time: -5, hearts: 99 },
      daily: { last: "not-a-date", streak: -3, days: { "2026-01-02": [10, 2], nope: [1, 1] } },
      stats: { playTime: "lots" },
      endlessSeed: -4,
      extra: "ignored",
    });
    expect(s.settings.lang).toBe("auto");
    expect(s.settings.theme).toBe("auto");
    expect(s.settings.sound).toBe(true);
    expect(s.settings.autoCross).toBe(false);
    expect(s.puzzles.ok).toEqual([1, 100, 3]);
    expect(s.puzzles.bad).toBeUndefined();
    expect(s.puzzles[""]).toBeUndefined();
    expect(s.puzzles.huge).toEqual([1, 359_999, 3]);
    expect(s.puzzles.neg).toEqual([1, 0, 0]);
    expect(s.current).toMatchObject({ id: "p", mode: "relax", src: "pack", day: "", time: 0, hearts: 3 });
    expect(s.daily.last).toBe("");
    expect(s.daily.streak).toBe(0);
    expect(s.daily.days).toEqual({ "2026-01-02": [10, 2] });
    expect(s.stats.playTime).toBe(0);
    expect(s.endlessSeed).toBe(1);
    expect(s).not.toHaveProperty("extra");
  });

  it("never throws on non-object input", () => {
    for (const junk of [null, undefined, 5, "str", [], [1, 2], true]) {
      expect(normalizeSave(junk)).toEqual(createDefaultSave());
    }
  });

  it("accepts data from a newer schema by keeping the fields it understands", () => {
    const s = normalizeSave({ v: 99, settings: { sound: false }, brandNewFeature: { a: 1 } });
    expect(s.settings.sound).toBe(false);
    expect(s.v).toBe(SCHEMA_VERSION);
  });
});

describe("SaveManager debounce and lifecycle", () => {
  it("coalesces rapid changes into a single write after 500 ms", async () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn(async () => ({ ok: true as const, bytes: 1 }));
      const m = new SaveManager({ read: async () => null, write, clear: async () => {} });
      const s = createDefaultSave();
      for (let i = 0; i < 5; i++) {
        s.stats.hintsUsed = i;
        m.set({ ...s });
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(write).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(500);
      expect(write).toHaveBeenCalledTimes(1);
      expect(decodePayload((write.mock.calls[0] as unknown as [string])[0])!.stats.hintsUsed).toBe(4);
      await m.flush(); // nothing dirty -> no second write
      expect(write).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flush() writes immediately and cancels the pending timer", async () => {
    vi.useFakeTimers();
    try {
      const write = vi.fn(async () => ({ ok: true as const, bytes: 1 }));
      const m = new SaveManager({ read: async () => null, write, clear: async () => {} });
      m.set(createDefaultSave());
      await m.flush();
      expect(write).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(write).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("flushes on pagehide and when the document becomes hidden, but not when visible", () => {
    const write = vi.fn(async () => ({ ok: true as const, bytes: 1 }));
    const m = new SaveManager({ read: async () => null, write, clear: async () => {} });
    const listeners = new Map<string, () => void>();
    const target = () => ({
      addEventListener: (t: string, l: () => void) => listeners.set(t, l),
      removeEventListener: (t: string) => listeners.delete(t),
    });
    const doc = { ...target(), visibilityState: "visible" };
    const off = m.attachLifecycle(target(), doc);
    m.set(createDefaultSave());
    listeners.get("visibilitychange")!();
    expect(write).not.toHaveBeenCalled();
    doc.visibilityState = "hidden";
    listeners.get("visibilitychange")!();
    expect(write).toHaveBeenCalledTimes(1);
    m.set(createDefaultSave());
    listeners.get("pagehide")!();
    expect(write).toHaveBeenCalledTimes(2);
    off();
    expect(listeners.size).toBe(0);
  });

  it("reports write results, including failures", async () => {
    const onWrite = vi.fn();
    const m = new SaveManager({ read: async () => null, write: async () => ({ ok: false, error: "too-large" }), clear: async () => {} }, { onWrite });
    m.set(createDefaultSave());
    await m.flush();
    expect(onWrite).toHaveBeenCalledWith({ ok: false, error: "too-large" });
    expect(m.lastWrite).toEqual({ ok: false, error: "too-large" });
  });
});
