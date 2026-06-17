# Requirements Document

## Introduction

This feature adds a multi-currency pricing system to the React e-commerce platform. AED is the master currency — every product must carry an AED price. Administrators may optionally define manual prices for any additional currency; when no manual price exists, the system automatically converts from AED using locally-cached exchange rates. The system must clearly distinguish manual prices from auto-converted prices on every customer-facing surface, preserve historical order pricing immutably, and remain fully operational even when the external exchange rate provider is unavailable.

---

## Glossary

- **AED**: United Arab Emirates Dirham — the platform's mandatory base currency. Every product must have an AED price.
- **Manual_Price**: A price explicitly set by an administrator for a specific currency, stored in `product_prices` with `is_manual = true`. Takes priority over conversion.
- **Converted_Price**: A price derived by multiplying the AED price by the stored exchange rate for the target currency.
- **Price_Source**: An enumerated tag attached to every resolved price, with values `manual` or `converted`.
- **Currency_Service**: The internal service layer that resolves exchange rates, abstracts the external provider, and is the sole source of rates for the Pricing_Engine.
- **Pricing_Engine**: The backend component that applies the priority logic (Manual_Price → Converted_Price) and returns a resolved price with its Price_Source.
- **Exchange_Rate_Provider**: The external API used exclusively during the scheduled sync job. Primary: `cdn.jsdelivr.net`; Fallback: `latest.currency-api.pages.dev`.
- **Rate_Sync_Job**: The scheduled background job that fetches rates from the Exchange_Rate_Provider and persists them to the `currency_rates` table every 24 hours.
- **Currency_Selector**: The UI control that allows a customer to choose their preferred display currency.
- **Price_Indicator**: The UI label displayed alongside a price that communicates whether the price is an Original/Fixed price (`manual`) or Converted from AED (`converted`).
- **Admin_Dashboard**: The administrative web interface used to manage products, pricing, and currency rates.
- **Order_Snapshot**: The immutable record of currency, unit price, total price, exchange rate used, and price source stored on `order_items` at checkout time.

---

## Requirements

---

### Requirement 1: AED Base Price Enforcement

**User Story:** As an administrator, I want every product to require an AED price, so that the system always has a reliable base from which to calculate any currency conversion.

#### Acceptance Criteria

1. THE Pricing_Engine SHALL reject any product save request that does not include an AED price, returning a validation error message that states "AED price is required."
2. WHEN an administrator attempts to delete or nullify the AED price of an existing product, THE Pricing_Engine SHALL block the operation and return a validation error.
3. THE Admin_Dashboard SHALL display the AED price field as required, preventing form submission when the field is empty.

---

### Requirement 2: Manual Currency Price Override

**User Story:** As an administrator, I want to define a fixed price for any currency on a per-product basis, so that I can control exact local pricing independently of exchange rate fluctuations.

#### Acceptance Criteria

1. WHEN an administrator saves a non-zero price for a specific currency on a product, THE Pricing_Engine SHALL store that value in `product_prices` with `is_manual = true` for that currency.
2. WHEN a customer requests the price of a product in a currency that has a Manual_Price, THE Pricing_Engine SHALL return the Manual_Price with `price_source = "manual"` without performing any currency conversion.
3. THE Admin_Dashboard SHALL support entering optional price values for each supported currency on the product pricing form.
4. WHEN an administrator clears a previously saved manual price for a currency, THE Pricing_Engine SHALL remove or nullify that `product_prices` row, causing subsequent requests to fall back to automatic conversion.

---

### Requirement 3: Automatic Currency Conversion

**User Story:** As a customer, I want to see a product price in my selected currency even when no manual price has been set, so that I can understand the cost without performing manual calculations.

#### Acceptance Criteria

1. WHEN a customer requests the price of a product in a currency that has no Manual_Price, THE Pricing_Engine SHALL multiply the product's AED price by the stored exchange rate for that currency and return the result with `price_source = "converted"`.
2. WHEN the stored exchange rate for a requested currency is unavailable, THE Pricing_Engine SHALL return the AED price as the fallback display price and indicate to the frontend that the selected currency is unavailable.
3. THE Pricing_Engine SHALL never call the Exchange_Rate_Provider directly during a customer-facing pricing request; rates MUST be read from the local `currency_rates` table.

---

### Requirement 4: Exchange Rate Synchronization

**User Story:** As a platform operator, I want exchange rates to be fetched and stored locally on a schedule, so that pricing calculations are fast, reliable, and independent of real-time API availability.

#### Acceptance Criteria

1. THE Rate_Sync_Job SHALL execute automatically every 24 hours to fetch AED-based exchange rates from the Exchange_Rate_Provider.
2. WHEN the primary Exchange_Rate_Provider endpoint (`cdn.jsdelivr.net`) is unavailable, THE Rate_Sync_Job SHALL retry using the fallback endpoint (`latest.currency-api.pages.dev`) before failing.
3. WHEN new rates are successfully fetched, THE Rate_Sync_Job SHALL update the `currency_rates` table with the new rates and set `synced_at` to the current timestamp.
4. IF both Exchange_Rate_Provider endpoints are unavailable during a sync attempt, THEN THE Rate_Sync_Job SHALL leave the existing cached rates unchanged and log the failure, so that storefront pricing continues to operate using the last successfully synced rates.
5. THE Currency_Service SHALL expose a manual "Refresh Rates" trigger for administrators that executes the same fetch-and-store flow as the scheduled job.

---

### Requirement 5: Local Exchange Rate Storage

**User Story:** As a platform operator, I want exchange rates stored in the database, so that the system remains operational and pricing remains consistent even during provider outages.

#### Acceptance Criteria

1. THE Currency_Service SHALL store each fetched rate as a row in `currency_rates` containing `base_currency`, `target_currency`, `rate`, `provider`, and `synced_at`.
2. WHEN the Rate_Sync_Job completes successfully, THE Currency_Service SHALL record the provider name used (primary or fallback) in the `provider` column of the updated rows.
3. THE Currency_Service SHALL provide a query interface that returns the most recent stored rate for a given base/target currency pair.

---

### Requirement 6: Order Price Locking (Order Snapshot)

**User Story:** As a customer, I want the price I paid at checkout to remain unchanged on my order history, so that future exchange rate changes do not alter my historical records.

#### Acceptance Criteria

1. WHEN a customer completes checkout, THE Pricing_Engine SHALL write the resolved `currency`, `unit_price`, `total_price`, `exchange_rate_used`, and `price_source` to the `order_items` row as an immutable Order_Snapshot.
2. WHEN the Price_Source of the checkout price is `"manual"`, THE Pricing_Engine SHALL record `exchange_rate_used` as `null` in the Order_Snapshot.
3. WHEN the Price_Source of the checkout price is `"converted"`, THE Pricing_Engine SHALL record the exact exchange rate used in the conversion in `exchange_rate_used` in the Order_Snapshot.
4. THE Pricing_Engine SHALL never recalculate or overwrite price fields on existing `order_items` rows after the order has been created.

---

### Requirement 7: Admin Estimated Conversion Preview

**User Story:** As an administrator, I want to see an estimated converted price for any currency field I leave empty on the product pricing form, so that I understand what customers will see before I save the product.

#### Acceptance Criteria

1. WHILE an administrator is editing a product's pricing form and a currency price field is empty, THE Admin_Dashboard SHALL display an estimated conversion value below that field calculated as `AED price × stored exchange rate`.
2. WHEN the AED price field value changes, THE Admin_Dashboard SHALL recalculate and update all estimated conversion previews in real time without requiring a page reload.
3. WHEN no stored exchange rate exists for a currency, THE Admin_Dashboard SHALL display "Rate unavailable" in place of the estimated conversion value.
4. THE Admin_Dashboard SHALL label the estimated value clearly as "Estimated" so administrators can distinguish it from a saved Manual_Price.

---

### Requirement 8: Admin Currency Rates Dashboard

**User Story:** As an administrator, I want a currency rates section in the Admin_Dashboard, so that I can monitor the current exchange rates and manually trigger a refresh when needed.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a Currency Rates table showing `target_currency`, `rate`, and `synced_at` for all stored rates.
2. WHEN an administrator clicks "Refresh Rates", THE Admin_Dashboard SHALL invoke the Currency_Service manual refresh trigger and display a success or failure notification upon completion.
3. WHEN the last sync timestamp is older than 24 hours, THE Admin_Dashboard SHALL visually indicate that the rates may be stale.

---

### Requirement 9: Price Source Indicators — Admin View

**User Story:** As an administrator, I want each currency price entry on the product pricing page to show whether the price is manually set or automatically converted, so that I can quickly audit the pricing configuration.

#### Acceptance Criteria

1. WHEN a Manual_Price exists for a currency on a product, THE Admin_Dashboard SHALL display a "Manual" badge next to that currency's price field.
2. WHEN no Manual_Price exists for a currency, THE Admin_Dashboard SHALL display an "Auto Conversion" badge and show the Estimated Conversion Preview for that currency.

---

### Requirement 10: Frontend Currency Selector

**User Story:** As a customer, I want to select my preferred display currency, so that I can view all prices in a currency that is meaningful to me.

#### Acceptance Criteria

1. THE Currency_Selector SHALL allow customers to manually select any currency that is supported by the platform.
2. WHEN a customer's browser locale matches a supported currency, THE Currency_Selector SHALL pre-select that currency as the default on first visit.
3. WHERE country detection is enabled, THE Currency_Selector SHALL use the detected country to set the initial currency if no user preference has been previously saved.
4. WHEN a customer manually selects a currency, THE Currency_Selector SHALL persist that selection as the customer's preference for subsequent sessions.

---

### Requirement 11: Product Page Price Display

**User Story:** As a customer, I want to see a Price_Indicator on the product page that tells me whether the displayed price is a fixed local price or a conversion from AED, so that I understand why the price may differ from what I expect.

#### Acceptance Criteria

1. WHEN a product's price for the selected currency has `price_source = "manual"`, THE product page SHALL display the price with a Price_Indicator labelled "Original Price" or "Fixed Local Price".
2. WHEN a product's price for the selected currency has `price_source = "converted"`, THE product page SHALL display the price with a Price_Indicator labelled "Converted from AED" and include the original AED amount.
3. WHEN the selected currency is unavailable and the AED fallback is displayed, THE product page SHALL indicate to the customer that the price is shown in AED because pricing in the selected currency is currently unavailable.

---

### Requirement 12: Cart, Checkout, and Order Details Price Display

**User Story:** As a customer, I want the price source indicator to be visible throughout the cart, checkout, and order history pages, so that I can always understand the nature of the price I am being charged.

#### Acceptance Criteria

1. WHILE a customer is viewing the cart, THE cart page SHALL display the Price_Indicator for each line item consistent with the product page indicator.
2. WHILE a customer is on the checkout page, THE checkout page SHALL display the Price_Indicator for each line item and the order total.
3. WHEN a customer views a past order in order details, THE order details page SHALL display the Price_Indicator using the `price_source` value stored in the Order_Snapshot, reflecting the source at the time of purchase.

---

### Requirement 13: Pricing Priority Logic Correctness

**User Story:** As a platform operator, I want the pricing resolution logic to be deterministic and testable, so that I can verify that manual prices always take precedence over conversions.

#### Acceptance Criteria

1. FOR ALL products and ALL currencies, WHEN both a Manual_Price and an applicable exchange rate exist, THE Pricing_Engine SHALL return the Manual_Price and SHALL NOT use the exchange rate.
2. FOR ALL products and ALL currencies, WHEN no Manual_Price exists and an exchange rate exists, THE Pricing_Engine SHALL return the Converted_Price.
3. FOR ALL products, WHEN the requested currency is AED, THE Pricing_Engine SHALL return the stored AED price directly with `price_source = "manual"` regardless of whether an exchange rate exists.
4. THE Pricing_Engine SHALL preserve the round-trip property: resolving a price and then re-resolving it with identical inputs SHALL return an identical result (idempotence).

---

### Requirement 14: Manual Price Zero Handling

**User Story:** As an administrator, I want to be able to set a price of zero for a currency to mark a product as free in that market, so that intentionally free products are correctly handled.

#### Acceptance Criteria

1. WHEN an administrator saves a price of `0` for a currency, THE Pricing_Engine SHALL treat it as a valid Manual_Price with `is_manual = true` and SHALL NOT fall back to AED conversion.
2. THE Admin_Dashboard SHALL require a deliberate confirmation step before saving a price of `0` to prevent accidental free-pricing.

---

### Requirement 15: Exchange Rate Provider Resilience

**User Story:** As a platform operator, I want the system to continue serving prices during external API outages, so that customer experience and revenue are not interrupted by third-party failures.

#### Acceptance Criteria

1. IF the primary Exchange_Rate_Provider endpoint fails, THEN THE Rate_Sync_Job SHALL automatically attempt the fallback endpoint before recording a sync failure.
2. IF both Exchange_Rate_Provider endpoints fail during a scheduled sync, THEN THE Currency_Service SHALL continue to serve exchange rates from the most recently cached `currency_rates` rows without degrading storefront availability.
3. THE Currency_Service SHALL expose the age of the most recently cached rate so that the Admin_Dashboard can display a staleness warning when rates have not been refreshed within 24 hours.
