export type CurrencyCode = "AED" | "USD" | "EGP" | "SAR" | "EUR";

export const MASTER_CURRENCIES: CurrencyCode[] = ["AED", "USD", "EGP", "SAR", "EUR"];

export const BASE_CURRENCY: CurrencyCode = "AED";

export interface CurrencySettings {
  enabled: CurrencyCode[];
  default: CurrencyCode;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  enabled: [...MASTER_CURRENCIES],
  default: BASE_CURRENCY,
};

/**
 * Validate + normalize an incoming currency-settings payload.
 * Throws Error (caller maps to HTTP 400) when the payload is unusable.
 */
export function normalizeCurrencySettings(input: unknown): CurrencySettings {
  const raw = (input ?? {}) as Partial<CurrencySettings>;

  if (!Array.isArray(raw.enabled)) {
    throw new Error("`enabled` must be an array of currency codes.");
  }

  // Filter to master list, dedupe, preserve master order.
  const enabled = MASTER_CURRENCIES.filter((c) => raw.enabled!.includes(c));

  if (enabled.length === 0) {
    throw new Error("At least one currency must be enabled.");
  }

  const def = raw.default as CurrencyCode | undefined;
  if (!def || !enabled.includes(def)) {
    throw new Error("`default` must be one of the enabled currencies.");
  }

  return { enabled, default: def };
}
