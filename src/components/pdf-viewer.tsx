"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, Minimize2 } from "lucide-react";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ lectureId, title }: { lectureId: string; title: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setLoading(false);
    setError("فشل تحميل الملف. حاول مرة أخرى.");
    console.error("PDF load error:", err);
  }, []);

  function prevPage() {
    setPageNumber((p) => Math.max(1, p - 1));
  }

  function nextPage() {
    setPageNumber((p) => Math.min(numPages, p + 1));
  }

  function zoomIn() {
    setScale((s) => Math.min(3, s + 0.2));
  }

  function zoomOut() {
    setScale((s) => Math.max(0.5, s - 0.2));
  }

  const pdfUrl = `/api/content/pdf/${lectureId}`;

  return (
    <div className={`flex flex-col ${fullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 rounded-t-xl border border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5} title="تصغير">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3} title="تكبير">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevPage} disabled={pageNumber <= 1} title="السابق">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {pageNumber} / {numPages}
          </span>
          <Button variant="ghost" size="icon" onClick={nextPage} disabled={pageNumber >= numPages} title="التالي">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <a href={pdfUrl} download className="inline-flex items-center justify-center rounded-md h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground" title="تحميل">
            <Download className="h-4 w-4" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "تصغير" : "ملء الشاشة"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className={`flex-1 overflow-auto border border-t-0 border-border bg-muted ${fullscreen ? "rounded-b-none" : "rounded-b-xl"}`}>
        {loading && (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
        {error ? (
          <div className="flex h-96 items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : null}
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          error=""
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className={loading ? "hidden" : ""}
          />
        </Document>
      </div>
    </div>
  );
}
