"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, Minimize2 } from "lucide-react";

// This file is loaded in the browser only. pdf.js needs browser-only APIs such
// as DOMMatrix, so evaluating it during server rendering would break a lecture page.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewerRenderer({
  lectureId,
  title,
  pageStart,
  pageEnd,
}: {
  lectureId: string;
  title: string;
  pageStart?: number | null;
  pageEnd?: number | null;
}) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [jumpedForNumPages, setJumpedForNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeStart = pageStart && pageStart > 0 ? pageStart : 1;
  const hasRange = !!(pageStart && pageEnd && pageEnd >= pageStart);
  const rangeEnd = hasRange ? Math.min(pageEnd as number, numPages || (pageEnd as number)) : null;

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((loadError: Error) => {
    setLoading(false);
    setError("فشل تحميل الملف. حاول مرة أخرى.");
    console.error("PDF load error:", loadError);
  }, []);

  if (numPages > 0 && jumpedForNumPages !== numPages) {
    setJumpedForNumPages(numPages);
    setPageNumber(Math.min(rangeStart, numPages));
  }

  function prevPage() {
    setPageNumber((page) => Math.max(rangeStart, page - 1));
  }

  function nextPage() {
    setPageNumber((page) => Math.min(rangeEnd ?? numPages, page + 1));
  }

  const pdfUrl = `/api/content/pdf/${lectureId}`;
  const minPage = rangeStart;
  const maxPage = rangeEnd ?? numPages;
  const relative = pageNumber - minPage + 1;
  const totalInRange = hasRange ? maxPage - minPage + 1 : numPages;

  return (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
      <div className="flex items-center justify-between gap-2 rounded-t-xl border border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScale((value) => Math.max(0.5, value - 0.2))} disabled={scale <= 0.5} title="تصغير">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale((value) => Math.min(3, value + 0.2))} disabled={scale >= 3} title="تكبير">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevPage} disabled={pageNumber <= minPage} title="السابق">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground" dir="ltr">
            {hasRange ? `${relative} / ${totalInRange}` : `${pageNumber} / ${numPages}`}
            {hasRange ? <span className="mx-1 text-xs opacity-60">(PDF: {pageNumber})</span> : null}
          </span>
          <Button variant="ghost" size="icon" onClick={nextPage} disabled={pageNumber >= maxPage} title="التالي">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {!loading && !error && hasRange ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">صفحات المحاضرة: {rangeStart}–{maxPage}</span> : null}
          <a href={pdfUrl} download className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="تحميل">
            <Download className="h-4 w-4" />
          </a>
          <Button variant="ghost" size="icon" onClick={() => setFullscreen((value) => !value)} title={fullscreen ? "تصغير" : "ملء الشاشة"}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`flex-1 overflow-auto border border-t-0 border-border bg-muted ${fullscreen ? "rounded-b-none" : "rounded-b-xl"}`}>
        {loading ? <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div> : null}
        {error ? <div className="flex h-96 items-center justify-center"><p className="text-sm text-red-500">{error}</p></div> : null}
        <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading="" error="">
          <Page pageNumber={Math.max(1, Math.min(pageNumber, numPages || 1))} scale={scale} renderTextLayer renderAnnotationLayer className={loading ? "hidden" : ""} />
        </Document>
      </div>
    </div>
  );
}
