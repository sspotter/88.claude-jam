import { describe, expect, it } from "vitest";
import {
  isAllowedFontExtension,
  mergeFontSelection,
  ALLOWED_FONT_EXTENSIONS,
} from "./fontSettings.js";

describe("isAllowedFontExtension", () => {
  it("accepts .ttf/.otf/.woff/.woff2 case-insensitively", () => {
    expect(isAllowedFontExtension("brand.ttf")).toBe(true);
    expect(isAllowedFontExtension("BRAND.TTF")).toBe(true);
    expect(isAllowedFontExtension("brand.otf")).toBe(true);
    expect(isAllowedFontExtension("brand.woff")).toBe(true);
    expect(isAllowedFontExtension("brand.woff2")).toBe(true);
  });

  it("rejects non-font extensions and extensionless names", () => {
    expect(isAllowedFontExtension("brand.png")).toBe(false);
    expect(isAllowedFontExtension("brand.ttf.exe")).toBe(false);
    expect(isAllowedFontExtension("noext")).toBe(false);
  });

  it("exposes the allowed list", () => {
    expect(ALLOWED_FONT_EXTENSIONS).toContain(".ttf");
  });
});

describe("mergeFontSelection", () => {
  it("preserves an existing custom font when switching selection", () => {
    const existing = { selectedFont: "custom", custom: { name: "Brand", url: "/uploads/x.ttf" } };
    expect(mergeFontSelection(existing, "maj")).toEqual({
      selectedFont: "maj",
      custom: { name: "Brand", url: "/uploads/x.ttf" },
    });
  });

  it("returns custom: null when there is no existing custom font", () => {
    expect(mergeFontSelection({ selectedFont: "default" }, "majalla")).toEqual({
      selectedFont: "majalla",
      custom: null,
    });
    expect(mergeFontSelection(null, "default")).toEqual({
      selectedFont: "default",
      custom: null,
    });
  });
});
