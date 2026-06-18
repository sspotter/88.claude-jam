import prisma from "../config/prisma.js";

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: "create" | "update" | "delete";
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

export interface AuditQuery {
  entity?: string;
  action?: string;
  limit?: number | string;
  offset?: number | string;
}

export interface NormalizedAuditQuery {
  entity: string | undefined;
  action: string | undefined;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function normalizeAuditQuery(raw: AuditQuery): NormalizedAuditQuery {
  // When limit is provided (including 0 or negative), clamp to [1, MAX_LIMIT].
  // When limit is absent, empty string, or NaN, fall back to DEFAULT_LIMIT.
  let limit: number;
  if (raw.limit !== undefined && raw.limit !== "") {
    const parsed = Number(raw.limit);
    if (Number.isFinite(parsed)) {
      limit = Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
    } else {
      limit = DEFAULT_LIMIT;
    }
  } else {
    limit = DEFAULT_LIMIT;
  }

  // When offset is provided and finite, floor negative values at 0.
  // When offset is absent, empty, or NaN, default to 0.
  let offset: number;
  if (raw.offset !== undefined && raw.offset !== "") {
    const parsed = Number(raw.offset);
    offset = Number.isFinite(parsed) ? Math.max(Math.floor(parsed), 0) : 0;
  } else {
    offset = 0;
  }

  return {
    entity: raw.entity || undefined,
    action: raw.action || undefined,
    limit,
    offset,
  };
}

/**
 * Best-effort audit write. Catches and logs its own errors and NEVER throws, so
 * a logging failure can never break or roll back the caller's mutation.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        before: (entry.before ?? null) as never,
        after: (entry.after ?? null) as never,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record audit entry:", err);
  }
}

export async function listAuditLogs(
  query: AuditQuery,
): Promise<{ logs: unknown[]; total: number }> {
  const { entity, action, limit, offset } = normalizeAuditQuery(query);
  const where = {
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total };
}
