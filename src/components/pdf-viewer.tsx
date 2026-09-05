"use client";

import dynamic from "next/dynamic";

const PdfViewerRenderer = dynamic(
  () => import("./pdf-viewer-renderer").then((module) => module.PdfViewerRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-xl border border-border bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  },
);

export function PdfViewer(props: {
  lectureId: string;
  title: string;
  pageStart?: number | null;
  pageEnd?: number | null;
}) {
  return <PdfViewerRenderer {...props} />;
}
