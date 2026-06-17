# Mega Import — Design

Date: 2026-06-17

## Goal

Add a **Mega Import** button to the admin Settings page that lets an admin upload a
previously generated **Mega Export** workbook and restore its data. This is the
inverse of the existing Mega Export button in the "Data Management" card.

## Scope

Frontend only. The backend endpoint `POST /api/admin/import`
(`server/src/routes/admin.routes.ts`) and the client function `importData`
(`src/lib/api/admin.ts`) already exist. No backend or API-client changes.

## UI

In the "Data Management" card of `src/pages/admin/Settings.tsx`, next to the
existing **Mega Export** button:

- A **Mega Import** button with an `Upload` icon (mirrors the `Download` icon).
- A hidden `<input type="file" accept=".xlsx, .xls">` triggered by the button,
  following the existing pattern in `src/pages/admin/Products.tsx`
  (`importInputRef`, reset `value` after import).
- An `importing` state mirrors the existing `exporting` state to disable the
  button and show "Importing…".

## Flow

1. Click **Mega Import** → opens file picker.
2. On file select, read with `FileReader.readAsBinaryString` and
   `XLSX.read(bstr, { type: "binary" })` (matches Products.tsx).
3. Read the `Products`, `Categories`, `Offers`, and `Orders` sheets back to JSON
   via `XLSX.utils.sheet_to_json`. The `Customers` sheet is derived data and is
   ignored — `/import` does not consume it.
4. `window.confirm("This will overwrite existing records with matching IDs. Continue?")`
   before sending (matches the destructive-action confirm pattern used elsewhere).
5. Call `importData({ categories, products, offers, orders })`.
6. On success, toast the returned counts; surface skipped rows if any. On error,
   `toast.error` + `handleApiError`.

## Known fidelity limits (inherent to the export format)

- Order **line items** are not restorable — the export flattens them to a count,
  so reimported orders have headers only.
- Order `notes` / `paymentMethod` are not in the export and fall back to backend
  defaults.

These match the documented behavior of the `/import` endpoint and are not
addressed here. Full-fidelity backup/restore would require changing both the
export format and the endpoint — out of scope.

## Out of scope

- Backend / endpoint changes.
- Changing the export format.
- A new file format (CSV/JSON).
