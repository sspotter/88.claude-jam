import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listAuditLogs } from "../../lib/api/audit";
import type { AuditLogRow } from "../../lib/api/audit";
import { handleApiError, OperationType } from "../../lib/api/errors";
import { ChevronDown, ChevronUp } from "lucide-react";

const LIMIT = 25;

const ENTITY_OPTIONS = [
  "product",
  "category",
  "offer",
  "base_currency",
  "currency_settings",
  "currency_rates",
  "product_prices",
];

const ACTION_OPTIONS = ["create", "update", "delete"];

const ENTITY_LABEL_KEYS: Record<string, string> = {
  product: "audit_entity_product",
  category: "audit_entity_category",
  offer: "audit_entity_offer",
  base_currency: "audit_entity_base_currency",
  currency_settings: "audit_entity_currency_settings",
  currency_rates: "audit_entity_currency_rates",
  product_prices: "audit_entity_product_prices",
};

const ACTION_LABEL_KEYS: Record<string, string> = {
  create: "audit_action_create",
  update: "audit_action_update",
  delete: "delete",
};

export default function AuditLog() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [offset, setOffset] = useState(0);

  const fetchLogs = async (
    entity: string,
    action: string,
    currentOffset: number,
  ) => {
    setLoading(true);
    try {
      const result = await listAuditLogs({
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
        limit: LIMIT,
        offset: currentOffset,
      });
      setLogs(result.logs);
      setTotal(result.total);
    } catch (e) {
      handleApiError(e, OperationType.GET, "audit-logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(entityFilter, actionFilter, offset);
  }, [entityFilter, actionFilter, offset]);

  const handleEntityChange = (e: { target: { value: string } }) => {
    setEntityFilter(e.target.value);
    setOffset(0);
  };

  const handleActionChange = (e: { target: { value: string } }) => {
    setActionFilter(e.target.value);
    setOffset(0);
  };

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + LIMIT, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-serif text-[var(--color-primary)]">
          {t("activity_log")}
        </h1>

        <div className="flex flex-wrap gap-3">
          <select
            value={entityFilter}
            onChange={handleEntityChange}
            aria-label={t("audit_entity")}
            className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
          >
            <option value="">{t("audit_entity")}: {t("audit_filter_all")}</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {t(ENTITY_LABEL_KEYS[e] ?? e)}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={handleActionChange}
            aria-label={t("audit_action")}
            className="px-4 py-2 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm font-medium text-stone-600"
          >
            <option value="">{t("audit_action")}: {t("audit_filter_all")}</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {t(ACTION_LABEL_KEYS[a] ?? a)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-stone-500">
            {t("audit_loading")}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            {t("audit_empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-sm">
                  <th className="p-4 font-medium text-stone-600">
                    {t("audit_time")}
                  </th>
                  <th className="p-4 font-medium text-stone-600">
                    {t("audit_actor")}
                  </th>
                  <th className="p-4 font-medium text-stone-600">
                    {t("audit_action")}
                  </th>
                  <th className="p-4 font-medium text-stone-600">
                    {t("audit_entity")}
                  </th>
                  <th className="p-4 font-medium text-stone-600">
                    {t("audit_entity_id")}
                  </th>
                  <th className="p-4 font-medium text-stone-600 w-12">
                    {t("audit_details")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logs.map((row) => (
                  <>
                    <tr
                      key={row.id}
                      className="hover:bg-stone-50 transition-colors"
                    >
                      <td className="p-4 text-sm text-stone-600 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm text-stone-700">
                        {row.actorEmail}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.action === "delete"
                              ? "bg-red-100 text-red-800"
                              : row.action === "create"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {t(ACTION_LABEL_KEYS[row.action] ?? row.action)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-stone-600">
                        {t(ENTITY_LABEL_KEYS[row.entity] ?? row.entity)}
                      </td>
                      <td className="p-4 text-sm text-stone-500 font-mono">
                        {row.entityId ?? "—"}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => toggleRow(row.id)}
                          className="p-1.5 text-stone-400 hover:text-[var(--color-primary)] rounded-lg hover:bg-stone-100 transition-colors"
                          title={t("audit_details")}
                        >
                          {expandedId === row.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr key={`${row.id}-expanded`} className="bg-stone-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                                {t("audit_before")}
                              </p>
                              <pre className="text-xs bg-white border border-stone-200 rounded-xl p-3 overflow-auto max-h-48 text-stone-700">
                                {JSON.stringify(row.before, null, 2)}
                              </pre>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                                {t("audit_after")}
                              </p>
                              <pre className="text-xs bg-white border border-stone-200 rounded-xl p-3 overflow-auto max-h-48 text-stone-700">
                                {JSON.stringify(row.after, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">
            {rangeStart}–{rangeEnd} / {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("audit_prev")}
            </button>
            <button
              type="button"
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("audit_next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
