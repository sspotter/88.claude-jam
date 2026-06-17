import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import {
  initCurrencyPreference,
  reconcileCurrencyWithSettings,
} from "./store/currencyStore";
import { useCurrencySettingsStore } from "./store/currencySettingsStore";
import { loadBaseCurrency } from "./store/baseCurrencyStore";

initCurrencyPreference();
void loadBaseCurrency();

// Load admin-configured currency availability, then reconcile the active
// currency against it (fail-open: defaults keep the storefront usable).
void useCurrencySettingsStore
  .getState()
  .load()
  .then(() => reconcileCurrencyWithSettings());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
