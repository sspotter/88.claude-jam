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

/** Thrown when an incoming payload is invalid; callers map this to HTTP 400. */
export class CurrencySettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurrencySettingsValidationError";
  }
}

/**
 * Validate + normalize an incoming currency-settings payload.
 * Throws CurrencySettingsValidationError (caller maps to HTTP 400) when unusable.
 */
export function normalizeCurrencySettings(input: unknown): CurrencySettings {
  const raw = (input ?? {}) as Partial<CurrencySettings>;

  if (!Array.isArray(raw.enabled)) {
    throw new CurrencySettingsValidationError("`enabled` must be an array of currency codes.");
  }

  // Filter to master list, dedupe, preserve master order.
  const enabled = MASTER_CURRENCIES.filter((c) => raw.enabled!.includes(c));

  if (enabled.length === 0) {
    throw new CurrencySettingsValidationError("At least one currency must be enabled.");
  }

  const def = raw.default as CurrencyCode | undefined;
  if (!def || !enabled.includes(def)) {
    throw new CurrencySettingsValidationError("`default` must be one of the enabled currencies.");
  }

  return { enabled, default: def };
}

export interface BaseCurrencySetting {
  base: CurrencyCode;
}

export const DEFAULT_BASE_CURRENCY: CurrencyCode = "AED";

export function normalizeBaseCurrency(input: unknown): BaseCurrencySetting {
  const raw = (input ?? {}) as Partial<BaseCurrencySetting>;
  const base = raw.base as CurrencyCode | undefined;
  if (!base || !MASTER_CURRENCIES.includes(base)) {
    throw new CurrencySettingsValidationError("`base` must be a supported currency.");
  }
  return { base };
}
