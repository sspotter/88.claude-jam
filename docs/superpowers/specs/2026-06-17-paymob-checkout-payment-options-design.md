# Paymob Checkout Payment Options — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)

## Goal

Let customers at checkout choose how to pay: **WhatsApp**, **Credit Card**, or
**Digital Wallet**. Card and wallet route through Paymob, which creates a payment
session and returns a hosted checkout link the customer is redirected to. After
paying, the customer returns to a branded status page that shows the order
resolving in real time.

## Background — what already exists

This is a **frontend-only** job. The backend and API client already support all
three methods:

- `server/src/services/payment.service.ts` — Paymob **Intention API** flow
  (`POST /v1/intention/` authenticated with the Secret Key as `Token <key>`,
  returning a `client_secret`) for both `card` and `wallet`. The `client_secret`
  + Public Key build the Unified Checkout URL. `notification_url` (webhook) and
  `redirection_url` (`/checkout/success?orderId=…`) are set per-intention, so no
  dashboard redirect config is required. (Refactored 2026-06-17 from the older
  auth-token → ecommerce-order → payment-key flow.)
- `server/src/routes/order.routes.ts` — `POST /api/orders/checkout` accepts
  `paymentMethod: "whatsapp" | "paymob_card" | "paymob_wallet"`, validates items
  and coupon, creates a `pending` order, and returns `{ success, orderId, redirectUrl }`
  (a `wa.me` link for WhatsApp, a Paymob hosted-checkout link for card/wallet).
- `server/src/routes/payment.routes.ts` — `POST /api/payments/paymob-webhook`
  with HMAC verification; marks orders paid/failed. **Webhook is the source of truth.**
- `server/src/routes/order.routes.ts` — `GET /api/orders/:id/status` (one-shot)
  and `GET /api/orders/:id/stream` (SSE) for live order status. The SSE stream was
  built for a "CheckoutSuccess page" that does not exist yet.
- `src/lib/api/orders.ts` — `checkout()` already typed for all three methods;
  `getOrderStatus()` available.
- `server/.env` — Paymob keys present: `PAYMOB_SECRET_KEY`, `PAYMOB_HMAC_SECRET`,
  `PAYMOB_CARD_INTEGRATION_ID`, `PAYMOB_WALLET_INTEGRATION_ID`, `PAYMOB_PUBLIC_KEY`.

### The gap

- `src/pages/Checkout.tsx` **hardcodes** `paymentMethod: "whatsapp"` (line 60) —
  no UI to choose card or wallet.
- There is no return/success page for the customer to land on after Paymob.

## Design

### 1. Payment-method selector — `src/pages/Checkout.tsx`

- Add state: `const [paymentMethod, setPaymentMethod] =
  useState<"whatsapp" | "paymob_card" | "paymob_wallet">("whatsapp")`.
  WhatsApp is preselected (preserves current default behavior).
- Render **three selectable cards** above the submit button, one selected at a
  time:
  - WhatsApp — `MessageCircle` icon (lucide-react)
  - Credit Card — `CreditCard` icon
  - Digital Wallet — `Wallet` icon
- Selected card is highlighted using the existing `--color-accent` / ring styles
  already used on form inputs; unselected cards use the neutral stone styling.
  Mobile-friendly (stacked / wrap).
- Replace the hardcoded `paymentMethod: "whatsapp"` on line 60 with the state value.
- Submit button label adapts to the choice:
  - WhatsApp → existing "Order via WhatsApp" label + WhatsApp icon.
  - Card/Wallet → "Pay Now" label (new i18n key) + a card/lock icon.

### 2. Redirect handling — `src/pages/Checkout.tsx` `handleSubmit`

- **WhatsApp (unchanged):** set `success` block, `clearCart()`, toast success,
  then `window.location.href = result.redirectUrl` (the `wa.me` link) after the
  existing short delay.
- **Card / Wallet:** `clearCart()` then **immediately** set
  `window.location.href = result.redirectUrl` (Paymob hosted checkout). Do **not**
  show the in-page success block — the customer is leaving the site and will land
  on `/checkout/success` when Paymob redirects back.
- Error handling stays as-is (`handleApiError` + toast, re-enable submit).

### 3. New return page — `src/pages/CheckoutSuccess.tsx`

Route: `/checkout/success`.

- Resolve the order id from query params: prefer `merchant_order_id` (Paymob
  appends this automatically on redirect), fall back to `orderId`.
- If no id is present, show a generic "We couldn't find your order" state with a
  link back to `/`.
- On mount:
  1. Call `getOrderStatus(id)` once for the initial state (fallback if SSE is slow
     or blocked).
  2. Open `new EventSource(\`${API_URL}/api/orders/${id}/stream\`)` and update state
     on each `data:` event. Close the stream on terminal status or component unmount.
- Three visual states (reuse Checkout's success-block styling for consistency):
  - **Processing** — spinner + "Confirming your payment…".
  - **Paid** — green check + order confirmed message + link to home / continue
    shopping.
  - **Failed** — red state + "Payment didn't go through" + a retry button linking
    back to `/cart`.
- Display-only. It never writes order status — the webhook owns that.

### 4. Routing — `src/App.tsx`

- Import `CheckoutSuccess` and register `{ path: "checkout/success", element:
  <CheckoutSuccess /> }` in **both** `<Layout>` route groups, mirroring how
  `checkout` is duplicated across the two groups today.

### 5. i18n — `src/i18n.ts`

Add keys to both `en` and `ar` resource bundles:

- `payment_method` — section heading ("Payment method" / "طريقة الدفع")
- `pay_whatsapp` — "WhatsApp" / "واتساب"
- `pay_card` — "Credit Card" / "بطاقة ائتمان"
- `pay_wallet` — "Digital Wallet" / "محفظة إلكترونية"
- `pay_now` — "Pay Now" / "ادفع الآن"
- `confirming_payment` — "Confirming your payment…" / "جارٍ تأكيد الدفع…"
- `payment_success` — "Payment confirmed!" / "تم تأكيد الدفع!"
- `payment_failed` — "Payment didn't go through" / "لم تتم عملية الدفع"
- `retry_payment` — "Try again" / "إعادة المحاولة"

(Exact Arabic wording can be refined during implementation; keys are the contract.)

## Prerequisites (configuration, not code)

With the Intention API the redirect and webhook URLs are passed **per intention**
(`redirection_url` / `notification_url`), so no dashboard redirect setup is needed.
The only requirements:

- `server/.env` must contain `PAYMOB_PUBLIC_KEY`, `PAYMOB_SECRET_KEY`,
  `PAYMOB_HMAC_SECRET`, `PAYMOB_CARD_INTEGRATION_ID`, `PAYMOB_WALLET_INTEGRATION_ID`,
  plus `FRONTEND_URL` and `PUBLIC_BASE_URL` (used to build the redirect/webhook URLs).
- For Paymob to deliver the webhook, `PUBLIC_BASE_URL` must be a **publicly
  reachable** origin. On localhost the redirect + success page work, but the order
  is only marked paid/failed once the webhook lands — use a tunnel (e.g. ngrok) to
  test the webhook locally.

## Assumptions & constraints

- **Currency:** Paymob charges in **EGP**. The checkout total for card/wallet is
  sent as the intention `amount` (in EGP piasters) by the backend. Storefront
  prices are treated as EGP at checkout. Multi-currency reconciliation with Paymob
  is **out of scope**.
- Test credentials for card/wallet are in `docs/paymobdocs/tezstcredentials.md`.

## Out of scope

- Schema changes; webhook handler logic (unchanged — it already reads
  `obj.order.merchant_order_id`, which the intention's `special_reference` maps to).
- New payment providers or Paymob features (refunds, saved cards, installments).
- Multi-currency handling at the Paymob layer.

> Note: the Paymob service WAS refactored (legacy payment-key flow → Intention
> API) on 2026-06-17 at the user's request after the initial frontend wiring. See
> the Background section.

## Testing

- Manual: run frontend + server, place an order with each method.
  - WhatsApp → redirects to `wa.me` with the order message.
  - Card → redirects to Paymob; pay with test Visa/Mastercard; land on
    `/checkout/success`; see Processing → Paid as the webhook resolves.
  - Wallet → redirects to Paymob wallet flow; test wallet number `01010101010`,
    MPin/OTP `123456`; land on success page.
  - Failed card → success page shows the Failed state with retry.
- `npm run lint` (tsc `--noEmit`) passes for the new/changed `.tsx`.
