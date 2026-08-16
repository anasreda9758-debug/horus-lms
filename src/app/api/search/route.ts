import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/shared/session";
import { getRAGIndex, retrieve } from "@/features/rag";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "missing query parameter 'q'" }, { status: 400 });
  }

  const moduleSlug = request.nextUrl.searchParams.get("module") ?? undefined;
  const topK = Math.min(parseInt(request.nextUrl.searchParams.get("k") ?? "5", 10), 20);

  try {
    const index = await getRAGIndex();
    const results = retrieve(index, q, { topK, moduleSlug });

    return NextResponse.json({
      query: q,
      results: results.map((r) => ({
        text: r.chunk.text.slice(0, 500),
        lectureTitle: r.chunk.lectureTitle,
        lectureId: r.chunk.lectureId,
        moduleSlug: r.chunk.moduleSlug,
        score: Math.round(r.score * 1000) / 1000,
      })),
    });
  } catch (err) {
    console.error("search error:", err);
    return NextResponse.json({ error: "search unavailable" }, { status: 502 });
  }
}
