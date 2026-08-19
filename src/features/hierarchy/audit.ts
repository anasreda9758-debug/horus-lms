import { randomUUID } from "node:crypto";
import { db } from "@/shared/db";
import { auditLog } from "@/features/hierarchy/schema";

export type AuditAction = "create" | "update" | "delete" | "reorder" | "payment";
export type AuditEntityType = "module" | "lecture" | "university" | "faculty" | "program" | "academic_year" | "semester" | "subject" | "subscription";

export async function logAudit(params: {
  userId: string;
  userName?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  await db.insert(auditLog).values({
    id: randomUUID(),
    userId: params.userId,
    userName: params.userName ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    entityName: params.entityName ?? null,
    oldData: params.oldData ? JSON.stringify(params.oldData) : null,
    newData: params.newData ? JSON.stringify(params.newData) : null,
  });
}

export async function getAuditLogs(opts?: { limit?: number; entityType?: string; userId?: string }) {
  const limit = opts?.limit ?? 50;
  let query = db.select().from(auditLog).$dynamic();

  // Simple filtering — we'll use raw SQL for simplicity
  const rows = await db.execute(
    `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit}`
  );

  return (rows as any[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    entityName: r.entity_name,
    oldData: r.old_data ? JSON.parse(r.old_data) : null,
    newData: r.new_data ? JSON.parse(r.new_data) : null,
    createdAt: r.created_at,
  }));
}
