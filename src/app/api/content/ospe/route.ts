import { NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getOspeModuleAccess } from "@/features/ospe/queries";
import { listOspeFolders } from "@/features/ospe/data";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const folders = await listOspeFolders();
  const access = await getOspeModuleAccess(session.user.id);
  const countByFolder = new Map(folders.map((f) => [f.folder, f.count]));

  return NextResponse.json({
    modules: access
      .filter((a) => (countByFolder.get(a.folder) ?? 0) > 0)
      .map((a) => ({ ...a, count: countByFolder.get(a.folder) ?? 0 })),
  });
}
