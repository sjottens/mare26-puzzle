import type { CookieJar } from "./cookies";

/** A browser-like cookie jar for tests: honours Max-Age=0 deletion and drops oversized cookies. */
export class FakeJar implements CookieJar {
  cookies = new Map<string, { value: string; attrs: string }>();
  /** Every raw string ever written, for attribute assertions. */
  writes: string[] = [];
  blocked = false;

  constructor(private readonly secure = false) {}

  read(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v.value}`).join("; ");
  }

  write(cookie: string): void {
    this.writes.push(cookie);
    if (this.blocked) return;
    const [pair, ...attrs] = cookie.split(";").map((s) => s.trim());
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    // Browsers ignore cookies whose name+value exceed 4096 bytes.
    if (name.length + value.length > 4096) return;
    const maxAge = attrs.find((a) => a.toLowerCase().startsWith("max-age="));
    if (maxAge && Number(maxAge.slice(8)) <= 0) {
      this.cookies.delete(name);
      return;
    }
    this.cookies.set(name, { value, attrs: attrs.join("; ") });
  }

  isSecure(): boolean {
    return this.secure;
  }
}
