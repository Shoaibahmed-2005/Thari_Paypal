import { describe, expect, it } from "vitest";
import { missingKeys, parseEnv } from "@/lib/env";

describe("env", () => {
  it("applies defaults and lists missing required keys", () => {
    const env = parseEnv({ NODE_ENV: "test" });
    expect(env.FX_INR_PER_USD).toBe(88);
    expect(env.SHIPPING_USD).toBe(20);
    expect(missingKeys(env)).toContain("DATABASE_URL");
  });

  it("treats blank values as missing", () => {
    const env = parseEnv({ NODE_ENV: "test", DATABASE_URL: "   " });
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("rejects bad enums", () => {
    expect(() => parseEnv({ NODE_ENV: "test", AI_MODE: "maybe" })).toThrow(/AI_MODE/);
  });
});
