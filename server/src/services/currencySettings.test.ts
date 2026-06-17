import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_SETTINGS,
  MASTER_CURRENCIES,
  normalizeCurrencySettings,
} from "./currencySettings.js";

describe("normalizeCurrencySettings", () => {
  it("accepts a valid payload unchanged", () => {
    const result = normalizeCurrencySettings({ enabled: ["AED", "USD"], default: "USD" });
    expect(result).toEqual({ enabled: ["AED", "USD"], default: "USD" });
  });

  it("drops entries not in the master list", () => {
    const result = normalizeCurrencySettings({ enabled: ["AED", "XYZ", "EUR"], default: "EUR" });
    expect(result.enabled).toEqual(["AED", "EUR"]);
  });

  it("dedupes and preserves master order", () => {
    const result = normalizeCurrencySettings({ enabled: ["EUR", "AED", "EUR"], default: "AED" });
    expect(result.enabled).toEqual(["AED", "EUR"]);
  });

  it("throws when enabled is empty after filtering", () => {
    expect(() => normalizeCurrencySettings({ enabled: ["XYZ"], default: "XYZ" })).toThrow(
      /at least one/i,
    );
  });

  it("throws when default is not in enabled", () => {
    expect(() => normalizeCurrencySettings({ enabled: ["AED", "USD"], default: "EUR" })).toThrow(
      /default/i,
    );
  });

  it("throws when enabled is not an array", () => {
    expect(() => normalizeCurrencySettings({ default: "AED" } as never)).toThrow(/enabled/i);
  });

  it("exposes the fixed master list and defaults", () => {
    expect(MASTER_CURRENCIES).toEqual(["AED", "USD", "EGP", "SAR", "EUR"]);
    expect(DEFAULT_CURRENCY_SETTINGS).toEqual({
      enabled: ["AED", "USD", "EGP", "SAR", "EUR"],
      default: "AED",
    });
  });
});
