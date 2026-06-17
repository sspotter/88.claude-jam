Excellent choice. This API fits the requirements very well because:

* Free
* No rate limits
* Supports AED, USD, EGP and future currencies
* Daily updated rates
* Simple integration
* Has a built-in fallback endpoint

I would update the phase plan to include a dedicated Currency Service that abstracts the exchange provider so we can replace it later without changing product pricing logic.

---

# Technical Design Update

## Currency Provider

Primary Source:

[Fawaz Ahmed Currency API Repository](https://github.com/fawazahmed0/exchange-api?utm_source=chatgpt.com)

Primary endpoint:

```text
https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.json
```

Fallback endpoint:

```text
https://latest.currency-api.pages.dev/v1/currencies/aed.json
```

---

# Example Response

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

# Currency Service Layer

Instead of calling the API directly from product logic:

```text
Product Service
       ↓
Currency Service
       ↓
Exchange API
```

This keeps the code clean and maintainable.

---

# Exchange Rate Flow

## Scheduled Sync Job

Recommended:

```text
Runs every 24 hours
```

Flow:

```text
1. Fetch AED rates
2. Save rates in database
3. Update last sync timestamp
4. Use stored rates for calculations
```

This avoids calling the API on every product page request.

---

# Database Structure

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

# Fallback Strategy

As recommended by the repository.

## Step 1

Try:

```text
cdn.jsdelivr.net
```

Example:

```text
https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/aed.json
```

---

## Step 2

If request fails:

```text
latest.currency-api.pages.dev
```

Example:

```text
https://latest.currency-api.pages.dev/v1/currencies/aed.json
```

---

## Step 3

If both fail:

Use the most recently saved exchange rates from the database.

```text
Database Cached Rates
```

This ensures pricing still works even if the external API is temporarily unavailable.

---

# Recommended Backend Logic

```pseudo
function getExchangeRate(currency):

    rate = DB.getLatestRate("AED", currency)

    if rate exists:
        return rate

    throw error
```

---

# Product Pricing Logic

```pseudo
function getPrice(product, currency):

    manualPrice = product.prices[currency]

    if manualPrice exists:
        return manualPrice

    aedPrice = product.prices["AED"]

    rate = CurrencyService.getExchangeRate(currency)

    return aedPrice * rate
```

Priority:

```text
Manual Currency Price
        ↓
AED Conversion
        ↓
Cached Rate Fallback
```

---

# Admin UI Enhancement

For each product:

```text
AED Price * (Required)

USD Price (Optional)
EGP Price (Optional)
```

Helper text:

```text
Leave empty to automatically convert from AED.
```

---

# Cart & Orders Requirement

A very important addition for this phase:

When an order is placed, save:

```sql
order_currency
exchange_rate_used
unit_price
total_price
```

Example:

```text
Currency: USD
Rate Used: 0.2722
Product Price: 50 USD
```

or

```text
Currency: EGP
Rate Used: 13.48
Product Price: 1348 EGP
```

This prevents historical orders from changing if exchange rates change tomorrow.

---

# Additional Acceptance Criteria

### Manual Price Override

Given:

```text
AED = 100
USD = 50
```

When user selects USD

Then:

```text
50 USD
```

And no conversion is executed.

---

### Automatic Conversion

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

is displayed.

---

### API Failure

Given:

```text
CDN unavailable
Cloudflare unavailable
```

Then:

```text
Use latest cached database rate
```

without affecting product display or checkout.

---

This makes the implementation production-ready, scalable to unlimited currencies, resilient to API outages, and fully aligned with the repository's recommended fallback mechanism.
