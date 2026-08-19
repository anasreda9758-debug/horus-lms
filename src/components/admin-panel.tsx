"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
  Users,
  ScrollText,
  Home,
} from "lucide-react";

type Module = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  isFree: boolean;
  term: number;
  lectureCount: number;
};

type Lecture = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  subject: string | null;
  kind: string | null;
  content: string | null;
  hasPdf: boolean;
  order: number;
  durationMin: number | null;
};

type AuditEntry = {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  newData: any;
  createdAt: string;
};

type Tab = "curriculum" | "users" | "audit";

// ── Module Form ──

function ModuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Module;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [term, setTerm] = useState(initial?.term ?? 1);
  const [isFree, setIsFree] = useState(initial?.isFree ?? false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onSave({ name, slug: slug || undefined, description, term, isFree, id: initial?.id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">الاسم</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Slug</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generate" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">الوصف</label>
        <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-muted-foreground">الترم</label>
          <select className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={term} onChange={(e) => setTerm(Number(e.target.value))}>
            <option value={1}>الترم الأول</option>
            <option value={2}>الترم الثاني</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          مجاني
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !name.trim()}>
          <Save className="ml-1 h-3.5 w-3.5" />
          {initial ? "تحديث" : "إنشاء"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="ml-1 h-3.5 w-3.5" />
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// ── Lecture Form ──

function LectureForm({
  moduleId,
  initial,
  onSave,
  onCancel,
}: {
  moduleId: string;
  initial?: Lecture;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "lecture");
  const [durationMin, setDurationMin] = useState(initial?.durationMin?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onSave({
        moduleId,
        title,
        slug: slug || undefined,
        summary,
        kind,
        durationMin: durationMin ? Number(durationMin) : null,
        id: initial?.id,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3 ml-8">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">العنوان</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Slug</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generate" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">ملخص</label>
        <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-muted-foreground">النوع</label>
          <select className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="lecture">محاضرة</option>
            <option value="seminar">سيمينار</option>
            <option value="practical">عملي</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">المدة (دقيقة)</label>
          <input type="number" className="mt-1 w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>
          <Save className="ml-1 h-3.5 w-3.5" />
          {initial ? "تحديث" : "إنشاء"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="ml-1 h-3.5 w-3.5" />
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// ── Main Admin Panel ──

export function AdminPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("curriculum");

  // Curriculum state
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [lectures, setLectures] = useState<Record<string, Lecture[]>>({});
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [editingLecture, setEditingLecture] = useState<string | null>(null);
  const [creatingLectureFor, setCreatingLectureFor] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  const fetchModules = useCallback(async () => {
    const res = await fetch("/api/admin/modules");
    if (res.ok) {
      const data = await res.json();
      setModules(data.modules);
    }
  }, []);

  const fetchLectures = useCallback(async (moduleId: string) => {
    const res = await fetch(`/api/admin/lectures?moduleId=${moduleId}`);
    if (res.ok) {
      const data = await res.json();
      setLectures((prev) => ({ ...prev, [moduleId]: data.lectures }));
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    const res = await fetch("/api/admin/audit?limit=50");
    if (res.ok) {
      const data = await res.json();
      setAuditLogs(data.logs);
    }
  }, []);

  useEffect(() => {
    fetchModules();
    if (tab === "audit") fetchAudit();
  }, [tab, fetchModules, fetchAudit]);

  // ── Module CRUD ──

  async function saveModule(data: any) {
    const method = data.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/modules", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setCreatingModule(false);
      setEditingModule(null);
      fetchModules();
    }
  }

  async function deleteModule(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الموديول وكل محاضراته؟")) return;
    const res = await fetch(`/api/admin/modules?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setModules((prev) => prev.filter((m) => m.id !== id));
    }
  }

  // ── Lecture CRUD ──

  async function saveLecture(data: any) {
    const method = data.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/lectures", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setCreatingLectureFor(null);
      setEditingLecture(null);
      if (data.moduleId) fetchLectures(data.moduleId);
    }
  }

  async function deleteLecture(id: string, moduleId: string) {
    if (!confirm("هل أنت متأكد من حذف هذه المحاضرة؟")) return;
    const res = await fetch(`/api/admin/lectures?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchLectures(moduleId);
    }
  }

  // ── Drag & Drop ──

  async function handleDrop(entityType: "module" | "lecture", items: { id: string; order: number }[]) {
    await fetch("/api/admin/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType, items }),
    });
    fetchModules();
  }

  const actionLabel = (a: string) => ({ create: "إنشاء", update: "تعديل", delete: "حذف", reorder: "ترتيب" }[a] ?? a);
  const entityLabel = (e: string) => ({ module: "موديول", lecture: "محاضرة", subject: "مادة" }[e] ?? e);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-card p-1">
        {([
          { key: "curriculum", label: "المنهج", icon: BookOpen },
          { key: "users", label: "المستخدمين", icon: Users },
          { key: "audit", label: "سجل التدقيق", icon: ScrollText },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Curriculum Tab ── */}
      {tab === "curriculum" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">إدارة المنهج</h2>
            <Button size="sm" onClick={() => setCreatingModule(true)}>
              <Plus className="ml-1 h-3.5 w-3.5" />
              موديول جديد
            </Button>
          </div>

          {creatingModule && (
            <div className="mb-4">
              <ModuleForm onSave={saveModule} onCancel={() => setCreatingModule(false)} />
            </div>
          )}

          <div className="space-y-2">
            {modules.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-card">
                {/* Module row */}
                <div
                  draggable
                  onDragStart={() => setDragId(m.id)}
                  onDragEnd={() => {
                    if (dragId && dragId !== m.id) {
                      const ids = modules.map((x) => x.id);
                      const fromIdx = ids.indexOf(dragId);
                      const toIdx = ids.indexOf(m.id);
                      const newIds = [...ids];
                      newIds.splice(fromIdx, 1);
                      newIds.splice(toIdx, 0, dragId);
                      handleDrop("module", newIds.map((id, i) => ({ id, order: i + 1 })));
                    }
                    setDragId(null);
                  }}
                  className={`flex items-center gap-3 p-4 cursor-grab ${dragId === m.id ? "opacity-50" : ""}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.term === 1 ? "الترم ١" : "الترم ٢"}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.lectureCount} محاضرة</span>
                      {m.isFree && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">مجاني</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">/{m.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedModule(expandedModule === m.id ? null : m.id)}>
                      {expandedModule === m.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingModule(editingModule === m.id ? null : m.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => deleteModule(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Edit module form */}
                {editingModule === m.id && (
                  <div className="px-4 pb-4">
                    <ModuleForm initial={m} onSave={saveModule} onCancel={() => setEditingModule(null)} />
                  </div>
                )}

                {/* Expanded lectures */}
                {expandedModule === m.id && (
                  <div className="border-t border-border px-4 pb-4 pt-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">المحاضرات ({m.lectureCount})</span>
                      <Button size="sm" variant="outline" onClick={() => { setCreatingLectureFor(creatingLectureFor === m.id ? null : m.id); if (!lectures[m.id]) fetchLectures(m.id); }}>
                        <Plus className="ml-1 h-3 w-3" />
                        محاضرة
                      </Button>
                    </div>

                    {creatingLectureFor === m.id && (
                      <div className="mb-2">
                        <LectureForm moduleId={m.id} onSave={saveLecture} onCancel={() => setCreatingLectureFor(null)} />
                      </div>
                    )}

                    {!lectures[m.id] ? (
                      <p className="text-xs text-muted-foreground">جاري التحميل...</p>
                    ) : lectures[m.id].length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا توجد محاضرات</p>
                    ) : (
                      <div className="space-y-1">
                        {lectures[m.id].map((l) => (
                          <div key={l.id} className="flex items-center gap-3 rounded-lg bg-background p-3">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            <div className="flex-1">
                              <span className="text-sm font-medium">{l.title}</span>
                              {l.kind && <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">{l.kind === "lecture" ? "محاضرة" : l.kind === "seminar" ? "سيمينار" : "عملي"}</span>}
                              {l.hasPdf && <FileText className="mr-1 inline h-3 w-3 text-muted-foreground" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingLecture(editingLecture === l.id ? null : l.id)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => deleteLecture(l.id, m.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div>
          <h2 className="mb-4 text-lg font-semibold">المستخدمين</h2>
          <p className="text-sm text-muted-foreground">إدارة المستخدمين والاشتراكات من صفحة الإدارة الرئيسية.</p>
          <Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <Users className="h-4 w-4" />
            الانتقال للإدارة الرئيسية
          </Link>
        </div>
      )}

      {/* ── Audit Tab ── */}
      {tab === "audit" && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">سجل التدقيق</h2>
            <Button size="sm" variant="outline" onClick={fetchAudit}>تحديث</Button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد سجلات بعد.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.action === "create" ? "bg-emerald-500/10 text-emerald-600" :
                      log.action === "delete" ? "bg-red-500/10 text-red-600" :
                      log.action === "reorder" ? "bg-blue-500/10 text-blue-600" :
                      "bg-amber-500/10 text-amber-600"
                    }`}>
                      {actionLabel(log.action)}
                    </span>
                    <span className="text-sm font-medium">{entityLabel(log.entityType)}</span>
                    {log.entityName && <span className="text-sm text-muted-foreground">— {log.entityName}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{log.userName ?? log.userId}</span>
                    <span>·</span>
                    <span>{new Date(log.createdAt).toLocaleString("ar-EG")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
