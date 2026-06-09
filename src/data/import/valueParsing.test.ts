import { describe, expect, it } from "vitest";
import { parseDateValue, parseNumberValue } from "./valueParsing";

describe("valueParsing", () => {
  it("parses supported date formats and Excel serial dates", () => {
    expect(parseDateValue("2026-06-09")).toEqual({
      ok: true,
      value: "2026-06-09",
    });
    expect(parseDateValue("2026/06/09")).toEqual({
      ok: true,
      value: "2026-06-09",
    });
    expect(parseDateValue(46282)).toEqual({ ok: true, value: "2026-09-17" });
  });

  it("rejects invalid dates", () => {
    expect(parseDateValue("2026-99-99").ok).toBe(false);
    expect(parseDateValue("").ok).toBe(false);
  });

  it("parses currency, commas, and empty optional values", () => {
    expect(parseNumberValue("$1,234.50", { required: true })).toEqual({
      ok: true,
      value: 1234.5,
    });
    expect(parseNumberValue("", { required: false, defaultValue: 0 })).toEqual({
      ok: true,
      value: 0,
    });
  });

  it("rejects invalid and negative required acquisition numbers", () => {
    expect(parseNumberValue("abc", { required: true }).ok).toBe(false);
    expect(
      parseNumberValue("-1", { required: true, allowNegative: false }).ok,
    ).toBe(false);
  });
});
