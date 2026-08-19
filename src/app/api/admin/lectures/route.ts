import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { lecture } from "@/features/curriculum/schema";
import { logAudit } from "@/features/hierarchy/audit";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

// GET — list lectures for a module
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const moduleId = request.nextUrl.searchParams.get("moduleId");
  if (!moduleId) return NextResponse.json({ error: "moduleId required" }, { status: 400 });

  const rows = await db.execute(sql`
    SELECT l.id, l.title, l.slug, l.summary, l."subject", l.kind, l.content, l.pdf_file,
      l."order", l.duration_min, l.created_at, l.updated_at
    FROM lecture l
    WHERE l.module_id = ${moduleId}
    ORDER BY l."order", l.title
  `);

  const lectures = (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary,
    subject: r.subject,
    kind: r.kind,
    content: r.content?.slice(0, 200) ?? null, // truncate for listing
    hasPdf: !!r.pdf_file,
    order: r.order,
    durationMin: r.duration_min,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ lectures });
}

// POST — create lecture
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.moduleId || !body.title) {
    return NextResponse.json({ error: "moduleId and title required" }, { status: 400 });
  }

  const slug = body.slug || body.title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/(^-|-$)/g, "");

  const id = randomUUID();
  const maxOrder = await db.execute(sql`SELECT COALESCE(MAX("order"), 0) + 1 as next_order FROM lecture WHERE module_id = ${body.moduleId}`);
  const nextOrder = (maxOrder as any[])[0]?.next_order ?? 1;

  await db.insert(lecture).values({
    id,
    moduleId: body.moduleId,
    title: body.title,
    slug,
    summary: body.summary ?? null,
    subject: body.subject ?? null,
    kind: body.kind ?? "lecture",
    content: body.content ?? null,
    pdfFile: body.pdfFile ?? null,
    order: body.order ?? nextOrder,
    durationMin: body.durationMin ?? null,
  });

  await logAudit({
    userId: admin.user.id,
    userName: admin.user.name,
    action: "create",
    entityType: "lecture",
    entityId: id,
    entityName: body.title,
    newData: { title: body.title, slug, moduleId: body.moduleId },
  });

  revalidatePath("/admin");
  revalidatePath("/curriculum");
  return NextResponse.json({ id, slug });
}

// PUT — update lecture
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.execute(sql`SELECT * FROM lecture WHERE id = ${body.id}`);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const updates: Record<string, any> = {};
  const allowed = ["title", "slug", "summary", "subject", "kind", "content", "pdfFile", "durationMin"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      const dbKey = key === "pdfFile" ? "pdf_file" : key === "durationMin" ? "duration_min" : key;
      updates[dbKey] = body[key];
    }
  }
  if (body.order !== undefined) updates["order"] = body.order;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const setClauses = Object.entries(updates)
    .map(([k, v]) => {
      if (v === null) return `"${k}" = NULL`;
      if (typeof v === "string") return `"${k}" = '${v.replace(/'/g, "''")}'`;
      return `"${k}" = ${v}`;
    })
    .join(", ");

  await db.execute(sql.raw(`UPDATE lecture SET ${setClauses}, updated_at = NOW() WHERE id = '${body.id}'`));

  await logAudit({
    userId: admin.user.id,
    userName: admin.user.name,
    action: "update",
    entityType: "lecture",
    entityId: body.id,
    entityName: body.title ?? (existing as any).title,
    oldData: { title: (existing as any).title },
    newData: updates,
  });

  revalidatePath("/admin");
  revalidatePath("/curriculum");
  return NextResponse.json({ ok: true });
}

// DELETE — delete lecture
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [existing] = await db.execute(sql`SELECT title FROM lecture WHERE id = ${id}`);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.execute(sql`DELETE FROM lecture WHERE id = ${id}`);

  await logAudit({
    userId: admin.user.id,
    userName: admin.user.name,
    action: "delete",
    entityType: "lecture",
    entityId: id,
    entityName: (existing as any).title,
  });

  revalidatePath("/admin");
  revalidatePath("/curriculum");
  return NextResponse.json({ ok: true });
}
