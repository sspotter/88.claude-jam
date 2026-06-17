Here's a structured prompt you can give to your developer, AI coding assistant, or use as a task specification.

---

# Feature Fix: Weight-Based Pricing for Variable Weight Products

## Objective

Implement proper weight-based pricing for products where the admin defines a single **price per kilogram**.

The product page, cart, checkout, and order calculations must dynamically calculate prices based on the selected weight option.

---

## Current Problem

The system currently displays the same price regardless of the selected weight.

Example:

* Price per kg = 10 AED
* Customer selects 500g → still shows 10 AED ❌
* Customer selects 1kg → shows 10 AED ✅
* Customer selects 2kg → still shows 10 AED ❌

The selected weight is not affecting the displayed price or cart calculations.

---

## Required Behavior

### Admin

Admin enters:

```json
{
  "pricePerKg": 10
}
```

This value represents the price for 1 kilogram.

---

### Weight Pricing Rules

| Weight | Multiplier | Calculated Price |
| ------ | ---------- | ---------------- |
| 500g   | 0.5        | 5 AED            |
| 1kg    | 1          | 10 AED           |
| 2kg    | 2          | 20 AED           |
| 3kg    | 3          | 30 AED           |

Formula:

```ts
calculatedPrice = pricePerKg * weightInKg
```

---

## Product Page Requirements

When the customer changes weight:

```txt
500g → 5 AED
1kg → 10 AED
2kg → 20 AED
3kg → 30 AED
```

The displayed product price must update immediately without refreshing the page.

The Add to Cart action must use the calculated price based on the selected weight.

---

## Cart Requirements

Different weights of the same product must be treated as separate cart items.

Example:

```txt
Dates - 3kg × 2
Dates - 500g × 3
```

These should appear as two separate cart lines.

### Example Calculation

Price per kg:

```txt
10 AED
```

Cart:

```txt
2 × 3kg = 60 AED
3 × 500g = 15 AED
```

Total:

```txt
75 AED
```

---

## Cart Item Identity

Do NOT merge cart items using only:

```ts
productId
```

Instead use:

```ts
productId + selectedWeight
```

or

```ts
{
  productId,
  weight
}
```

So:

```txt
Dates (500g)
Dates (1kg)
Dates (2kg)
```

are treated as different cart entries.

---

## Order Storage Requirements

Orders must store the selected weight and calculated unit price at the time of purchase.

Example:

```json
{
  "productId": "dates",
  "weight": "3kg",
  "quantity": 2,
  "pricePerKg": 10,
  "unitPrice": 30,
  "subtotal": 60
}
```

And:

```json
{
  "productId": "dates",
  "weight": "500g",
  "quantity": 3,
  "pricePerKg": 10,
  "unitPrice": 5,
  "subtotal": 15
}
```

This prevents future admin price changes from affecting historical orders.

---

## Technical Requirements

### Create Weight Conversion Mapping

```ts
const WEIGHT_MULTIPLIERS = {
  "500g": 0.5,
  "1kg": 1,
  "2kg": 2,
  "3kg": 3,
};
```

### Dynamic Price Calculation

```ts
const unitPrice =
  product.pricePerKg * WEIGHT_MULTIPLIERS[selectedWeight];
```

### Cart Line Total

```ts
lineTotal = unitPrice * quantity;
```

### Cart Grand Total

```ts
cartTotal = sum(allLineTotals);
```

---

## Acceptance Criteria

* [ ] Product price changes instantly when weight changes.
* [ ] Add-to-cart uses calculated weight-based price.
* [ ] Different weights of the same product are stored as separate cart lines.
* [ ] Cart totals are calculated correctly.
* [ ] Checkout totals match cart totals.
* [ ] Orders store selected weight and calculated unit price.
* [ ] Historical orders remain unchanged if admin later updates the product price.
* [ ] Existing fixed-price products continue to work normally.

---

## Expected Example

Admin price:

```txt
10 AED per kg
```

Customer adds:

```txt
3kg × 2
500g × 3
```

Result:

```txt
3kg unit price = 30 AED
subtotal = 60 AED

500g unit price = 5 AED
subtotal = 15 AED

Order total = 75 AED
```

No weight aggregation should occur. Each weight selection must remain a separate order line item.
