import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { getSession } from "@/shared/session";
import { db } from "@/shared/db";
import { logAudit } from "@/features/hierarchy/audit";

// POST — reorder items (modules or lectures)
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { entityType, items } = body as {
    entityType: "module" | "lecture";
    items: { id: string; order: number }[];
  };

  if (!entityType || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "entityType and items required" }, { status: 400 });
  }

  const table = entityType === "module" ? "module" : "lecture";

  for (const item of items) {
    await db.execute(sql.raw(`UPDATE "${table}" SET "order" = ${item.order}, updated_at = NOW() WHERE id = '${item.id}'`));
  }

  await logAudit({
    userId: session.user.id,
    userName: session.user.name,
    action: "reorder",
    entityType,
    entityName: `${items.length} items`,
    newData: { order: items.map((i) => ({ id: i.id, order: i.order })) },
  });

  revalidatePath("/admin");
  revalidatePath("/curriculum");
  return NextResponse.json({ ok: true });
}
