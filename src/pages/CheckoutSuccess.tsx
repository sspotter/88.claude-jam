import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { API_BASE } from "../lib/api/client";
import { getOrderStatus, verifyPayment } from "../lib/api/orders";

type ViewStatus = "processing" | "paid" | "failed" | "not_found";

function toViewStatus(status?: string): ViewStatus {
  if (status === "paid") return "paid";
  if (status === "failed") return "failed";
  return "processing";
}

export default function CheckoutSuccess() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  // Paymob appends `merchant_order_id` on redirect; fall back to our own param.
  const orderId = params.get("merchant_order_id") || params.get("orderId");

  const [status, setStatus] = useState<ViewStatus>(orderId ? "processing" : "not_found");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let active = true;

    // If Paymob redirected us back with signed result params, verify them
    // server-side first. This resolves the order from the redirect alone, which
    // is what makes confirmation work when the webhook can't reach the backend
    // (e.g. a localhost server with no public tunnel).
    const redirectParams: Record<string, string> = {};
    params.forEach((value, key) => {
      redirectParams[key] = value;
    });

    if (redirectParams.hmac) {
      verifyPayment(orderId, redirectParams)
        .then((res) => {
          if (active) setStatus(toViewStatus(res.status));
        })
        .catch(() => {
          /* fall back to the status read + SSE below */
        });
    }

    // Initial one-shot read as a fallback before the stream resolves.
    getOrderStatus(orderId)
      .then((order) => {
        if (active) setStatus((prev) => (prev === "paid" || prev === "failed" ? prev : toViewStatus(order.status)));
      })
      .catch(() => {
        /* stream below is the primary source; ignore initial fetch errors */
      });

    // Live updates via SSE until a terminal status is reached.
    const es = new EventSource(`${API_BASE}/api/orders/${orderId}/stream`);
    esRef.current = es;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Fallback once the stream gives up on us: poll occasionally instead of
    // holding a connection open, so a tab left open on a never-resolving
    // order doesn't keep reconnecting forever.
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        getOrderStatus(orderId)
          .then((order) => {
            if (!active) return;
            const next = toViewStatus(order.status);
            setStatus((prev) => (prev === "paid" || prev === "failed" ? prev : next));
            if ((next === "paid" || next === "failed") && pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          })
          .catch(() => {
            /* keep polling; a transient failure isn't terminal */
          });
      }, 20000);
    };

    es.onmessage = (event) => {
      if (!active) return;
      try {
        const data = JSON.parse(event.data) as {
          status?: string;
          error?: string;
        };
        if (data.error === "not_found") {
          setStatus("not_found");
          es.close();
          return;
        }
        if (data.status === "timeout") {
          // Server capped the stream's lifetime. Stop here rather than letting
          // EventSource auto-reconnect — fall back to light polling instead.
          es.close();
          startPolling();
          return;
        }
        const next = toViewStatus(data.status);
        // Never downgrade a status that verify (or an earlier event) resolved.
        setStatus((prev) => (prev === "paid" || prev === "failed" ? prev : next));
        if (next === "paid" || next === "failed") es.close();
      } catch {
        /* ignore malformed events */
      }
    };

    es.onerror = () => {
      // Network/stream hiccup — the EventSource will retry on its own; we keep
      // showing the last known state. Nothing to do here.
    };

    return () => {
      active = false;
      es.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [orderId]);

  return (
    <div className="max-w-xl mx-auto py-6">
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 sm:p-8">
        <div className="text-center py-10 space-y-4 animate-fade-in">
          {status === "processing" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-[var(--color-accent)] rounded-full animate-spin" />
              </div>
              <p className="text-xl font-serif font-bold text-stone-800">
                {t("confirming_payment")}
              </p>
            </>
          )}

          {status === "paid" && (
            <>
              <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-green-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-xl font-serif font-bold text-stone-800">
                {t("payment_success")}
              </p>
              <p className="text-stone-500">{t("payment_success_desc")}</p>
              <Link
                to="/"
                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all"
              >
                {t("continue_shopping")}
              </Link>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100">
                <XCircle className="w-10 h-10" />
              </div>
              <p className="text-xl font-serif font-bold text-stone-800">
                {t("payment_failed")}
              </p>
              <p className="text-stone-500">{t("payment_failed_desc")}</p>
              <Link
                to="/cart"
                className="inline-block mt-4 px-6 py-3 bg-stone-800 text-white rounded-xl font-semibold hover:bg-stone-900 transition-all"
              >
                {t("retry_payment")}
              </Link>
            </>
          )}

          {status === "not_found" && (
            <>
              <div className="w-20 h-20 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-stone-200">
                <XCircle className="w-10 h-10" />
              </div>
              <p className="text-xl font-serif font-bold text-stone-800">
                {t("order_not_found")}
              </p>
              <Link
                to="/"
                className="inline-block mt-4 px-6 py-3 bg-stone-800 text-white rounded-xl font-semibold hover:bg-stone-900 transition-all"
              >
                {t("continue_shopping")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
