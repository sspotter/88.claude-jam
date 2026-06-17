Here's an updated consolidated implementation phase document that incorporates:

* Multi-currency pricing
* Currency service abstraction
* Exchange rate provider integration
* Admin pricing management page enhancements
* Estimated conversion visibility for admins
* User-facing indication of manual vs converted pricing
* Order price locking
* Production-ready fallback strategy

---

# Phase: Multi-Currency Product Pricing & Currency Management

## Objective

Implement a scalable multi-currency pricing system where AED remains the master currency while allowing administrators to define manual prices for specific currencies.

The system must:

* Support unlimited currencies.
* Allow manual price overrides per currency.
* Automatically convert AED prices when no manual price exists.
* Clearly distinguish between manually configured prices and auto-converted prices.
* Provide administrators with estimated conversion values while managing pricing.
* Store exchange rates locally for performance and reliability.
* Preserve historical order pricing regardless of future exchange rate changes.

---

# Business Requirements

## Base Currency

AED is the platform's primary currency.

Rules:

* Every product must have an AED price.
* AED price is mandatory.
* All automatic currency calculations originate from AED.

Example:

| Currency | Price |
| -------- | ----- |
| AED      | 100   |

---

## Manual Currency Pricing

Administrators may optionally define custom prices for any supported currency.

Example:

| Currency | Price Type | Value |
| -------- | ---------- | ----- |
| AED      | Manual     | 100   |
| USD      | Manual     | 50    |
| EGP      | Manual     | 100   |

Behavior:

* USD customers see 50 USD.
* EGP customers see 100 EGP.
* AED customers see 100 AED.
* No conversion occurs when a manual price exists.

---

## Automatic Currency Conversion

If a manual price does not exist, the platform automatically converts the AED price.

Example:

| Currency | Price |
| -------- | ----- |
| AED      | 100   |
| USD      | null  |
| EGP      | null  |

Result:

| Currency | Displayed Price    |
| -------- | ------------------ |
| AED      | 100 AED            |
| USD      | Converted from AED |
| EGP      | Converted from AED |

---

# Pricing Priority Logic

```text
IF manual price exists
    Use manual price
ELSE
    Convert AED price using exchange rate
```

Example:

```text
AED = 100
USD = 50
EGP = null
```

Result:

```text
AED -> 100 AED
USD -> 50 USD
EGP -> Converted AED value
```

---

# Currency Service Architecture

The pricing engine must not directly depend on the external exchange rate provider.

Architecture:

```text
Product Pricing Service
          ↓
     Currency Service
          ↓
 Exchange Rate Provider
```

Benefits:

* Provider replacement without affecting pricing logic.
* Easier testing.
* Better maintainability.

---

# Exchange Rate Provider

## Primary Provider

Fawaz Ahmed Currency API

Primary Endpoint:

```text
https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.json
```

Fallback Endpoint:

```text
https://latest.currency-api.pages.dev/v1/currencies/aed.json
```

---

## Example Response

```json
{
  "date": "2025-06-01",
  "aed": {
    "usd": 0.2722,
    "egp": 13.48
  }
}
```

---

# Exchange Rate Synchronization

## Scheduled Job

Frequency:

```text
Every 24 hours
```

Flow:

```text
1. Fetch AED exchange rates
2. Store rates in database
3. Update sync timestamp
4. Use stored rates for pricing calculations
```

Runtime product requests should never call the external API directly.

---

# Database Design

## products

```sql
id
name
description
...
```

---

## product_prices

```sql
id
product_id
currency_code
price
is_manual
created_at
updated_at
```

Example:

| Product | Currency | Price | Manual |
| ------- | -------- | ----- | ------ |
| 1       | AED      | 100   | true   |
| 1       | USD      | 50    | true   |

No EGP row means automatic conversion.

---

## currency_rates

```sql
id
base_currency
target_currency
rate
provider
synced_at
created_at
updated_at
```

Example:

| Base | Target | Rate   |
| ---- | ------ | ------ |
| AED  | USD    | 0.2722 |
| AED  | EGP    | 13.48  |

---

## Orders

Historical pricing must be preserved.

### order_items

```sql
id
order_id
product_id

currency

unit_price

total_price

exchange_rate_used

price_source

created_at
```

### price_source

Values:

```text
manual
converted
```

Example:

```text
Currency: USD
Price Source: manual
Unit Price: 50
Exchange Rate Used: null
```

or

```text
Currency: EGP
Price Source: converted
Unit Price: 1348
Exchange Rate Used: 13.48
```

---

# Admin Pricing Management

The existing **Pricing** page will be enhanced with currency management features.

---

## Product Pricing Section

### Base Price

```text
AED Price *
```

Required.

---

## Currency Prices

Example:

```text
USD Price (Optional)

EGP Price (Optional)

SAR Price (Optional)

EUR Price (Optional)
```

Helper text:

```text
Leave empty to automatically convert from AED.
```

---

## Estimated Conversion Preview

For currencies without manual prices, show the calculated value using the current exchange rate.

Example:

```text
AED Price: 100

USD Price: [empty]
Estimated: 27.22 USD

EGP Price: [empty]
Estimated: 1,348 EGP
```

This allows administrators to understand what customers will see before saving.

---

## Price Source Indicators

Show the status of each currency:

```text
USD
Price: 50
Source: Manual
```

```text
EGP
Price: 1,348
Source: Auto Conversion
```

---

## Pricing Dashboard Enhancements

The existing Pricing page should include:

### Currency Rates Section

Display:

| Currency | Current Rate | Last Updated |
| -------- | ------------ | ------------ |
| USD      | 0.2722       | 2025-06-01   |
| EGP      | 13.48        | 2025-06-01   |

Actions:

```text
Refresh Rates
View Last Sync
View Provider Status
```

---

# Frontend Requirements

## Currency Selector

Supported methods:

* User preference
* Browser locale
* Country detection
* Manual selector

Example:

```text
AED
USD
EGP
```

---

## Product Page Display

### Manual Price

```text
$50 USD
```

Indicator:

```text
Original Price
```

or

```text
Fixed Local Price
```

---

### Converted Price

```text
1,348 EGP
```

Indicator:

```text
Converted from AED
```

or

```text
Estimated from current exchange rate
```

Example UI:

```text
1,348 EGP

Converted from 100 AED
```

This creates transparency for customers and explains why prices may fluctuate.

---

## Cart & Checkout

The same pricing source indicator should remain visible throughout:

* Product page
* Cart
* Checkout
* Order details

Example:

```text
Price Source:
Converted from AED
```

or

```text
Price Source:
Original Local Price
```

---

# Backend Pricing Logic

```pseudo
function getProductPrice(product, currency):

    if currency == AED:
        return AED manual price

    manualPrice = findManualPrice(product, currency)

    if manualPrice exists:
        return {
            price: manualPrice,
            source: "manual"
        }

    aedPrice = getAEDPrice(product)

    rate = CurrencyService.getExchangeRate(currency)

    return {
        price: aedPrice * rate,
        source: "converted",
        exchangeRate: rate
    }
```

---

# Fallback Strategy

Priority:

```text
Manual Price
      ↓
AED Conversion
      ↓
Stored Exchange Rates
```

Provider flow:

```text
1. jsdelivr endpoint
2. pages.dev endpoint
3. Cached database rates
```

---

# Edge Cases

## Missing Exchange Rates

If all providers fail:

Option A:

```text
Display AED price
```

Option B:

```text
Price unavailable in selected currency
```

Business decision required.

---

## Missing AED Price

Not allowed.

Validation:

```text
AED price is required.
```

---

## Manual Price Equals Zero

Allow only when the product is intentionally free.

---

## Rate Changes After Checkout

Historical orders must never be recalculated.

Stored order pricing always remains unchanged.

---

# Acceptance Criteria

## Scenario 1: Manual Price Exists

Given:

```text
AED = 100
USD = 50
```

When customer selects USD

Then:

```text
50 USD
```

And:

```text
Source = Manual
```

No conversion occurs.

---

## Scenario 2: Automatic Conversion

Given:

```text
AED = 100
USD = null
```

Current rate:

```text
AED → USD = 0.2722
```

Then:

```text
27.22 USD
```

And:

```text
Source = Converted
```

is displayed.

---

## Scenario 3: Admin Estimated Conversion

Given:

```text
AED = 100
USD Price = Empty
```

Then admin sees:

```text
Estimated Price:
27.22 USD
```

before saving.

---

## Scenario 4: API Failure

Given:

```text
Primary provider unavailable
Fallback provider unavailable
```

Then:

```text
Latest cached database rate is used
```

without affecting storefront pricing or checkout.

---

# Deliverables

1. Multi-currency database design.
2. Product pricing storage model.
3. Currency service abstraction layer.
4. Exchange rate synchronization job.
5. Currency rate caching and storage.
6. Pricing page enhancements.
7. Estimated conversion previews for admins.
8. Manual vs converted price indicators.
9. Frontend currency selector.
10. Product page pricing updates.
11. Cart and checkout currency support.
12. Order price locking and audit fields.
13. API fallback and resiliency implementation.
14. Automated tests for pricing scenarios.
15. Documentation and admin usage guide.

## Expected Outcome

A production-ready multi-currency pricing system where AED remains the master currency, administrators can override prices per currency, customers can clearly identify whether prices are fixed or exchange-rate converted, and the platform remains resilient to exchange rate provider outages.
