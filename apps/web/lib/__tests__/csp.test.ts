import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "../csp";

const directive = (csp: string, name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

describe("contentSecurityPolicy (cc-63, X6)", () => {
  it("production: no localhost in connect-src, and a form can only post to this site", () => {
    const csp = contentSecurityPolicy({ development: false, apiOrigin: "https://api.fortifykitchen.example" });
    expect(csp).not.toMatch(/localhost/);
    // JavaScript eval stays shut; WebAssembly may compile (the WASM WebP encoder of Thêm bài, for WebKit)
    expect(csp).not.toContain("'unsafe-eval'");
    expect(directive(csp, "script-src")).toContain("'wasm-unsafe-eval'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
    expect(directive(csp, "connect-src")).toContain("https://api.fortifykitchen.example");
    expect(directive(csp, "connect-src")).toContain("https://*.supabase.co");
  });

  it("development: the dev server's http and ws localhost, and eval for hot reload", () => {
    const csp = contentSecurityPolicy({ development: true, apiOrigin: "" });
    expect(directive(csp, "connect-src")).toContain("http://localhost:*");
    expect(directive(csp, "connect-src")).toContain("ws://localhost:*");
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "form-action")).toBe("form-action 'self'");
  });

  it("no empty entry when there is no API origin, and the rest is unchanged (script-src keeps 'unsafe-inline' for now, and gains 'wasm-unsafe-eval')", () => {
    const csp = contentSecurityPolicy({ development: false, apiOrigin: "" });
    expect(directive(csp, "connect-src")).not.toMatch(/\s{2}/);
    expect(directive(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://hcaptcha.com https://*.hcaptcha.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
