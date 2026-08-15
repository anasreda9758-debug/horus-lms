import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getOspeModuleAccess } from "@/features/ospe/queries";
import { listImagesInFolder } from "@/features/ospe/data";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const folder = request.nextUrl.searchParams.get("folder") ?? "all";
  const access = await getOspeModuleAccess(session.user.id);

  // Pick uniformly among all accessible images (or restrict to one folder).
  const pools: { folder: string; fileName: string }[] = [];
  for (const a of access) {
    if (folder !== "all" && a.folder !== folder) continue;
    if (a.locked) continue;
    const files = await listImagesInFolder(a.folder);
    for (const fileName of files) pools.push({ folder: a.folder, fileName });
  }
  if (pools.length === 0) {
    return NextResponse.json({ error: "no accessible stations" }, { status: 403 });
  }

  const pick = pools[Math.floor(Math.random() * pools.length)];
  const meta = access.find((a) => a.folder === pick.folder);

  return NextResponse.json({
    folder: pick.folder,
    fileName: pick.fileName,
    moduleName: meta?.moduleName ?? null,
    moduleSlug: meta?.moduleSlug ?? null,
    url: `/api/content/ospe/image?folder=${encodeURIComponent(pick.folder)}&file=${encodeURIComponent(pick.fileName)}`,
  });
}
