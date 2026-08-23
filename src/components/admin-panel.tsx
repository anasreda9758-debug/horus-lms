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
  BarChart3,
  CreditCard,
  GraduationCap,
  Activity,
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

type PlatformStats = {
  users: { total: number; students: number };
  content: { modules: number; lectures: number };
  quizzes: { attempts: number; answers: number; correct: number };
  subscriptions: { active: number };
  recentActivity: { last7Days: number };
  topModules: { name: string; slug: string; attempts: number }[];
  topUsers: { name: string; email: string; quizzes: number; accuracy: number }[];
};

type Tab = "dashboard" | "curriculum" | "users" | "audit";

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
  const [tab, setTab] = useState<Tab>("dashboard");

  // Dashboard state
  const [stats, setStats] = useState<PlatformStats | null>(null);

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
  // Users state
  const [usersList, setUsersList] = useState<{ id: string; name: string | null; email: string; role: string; createdAt: string; quizzes: number; accuracy: number }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

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

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
      if (data.topUsers) setUsersList(data.topUsers.map((u: any) => ({ id: u.email, name: u.name, email: u.email, role: "student", createdAt: "", quizzes: u.quizzes, accuracy: u.accuracy })));
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.topUsers) setUsersList(data.topUsers.map((u: any) => ({ id: u.email, name: u.name, email: u.email, role: "student", createdAt: "", quizzes: u.quizzes, accuracy: u.accuracy })));
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModules();
    if (tab === "audit") fetchAudit();
    if (tab === "dashboard") fetchStats();
    if (tab === "users") fetchUsers();
  }, [tab, fetchModules, fetchAudit, fetchStats, fetchUsers]);

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
          { key: "dashboard", label: "لوحة القيادة", icon: BarChart3 },
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

      {/* ── Dashboard Tab ── */}
      {tab === "dashboard" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">لوحة القيادة</h2>
            <Button size="sm" variant="outline" onClick={fetchStats}>تحديث</Button>
          </div>

          {stats ? (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashCard icon={Users} label="المستخدمين" value={stats.users.total} sub={`${stats.users.students} طالب`} color="text-blue-600 bg-blue-50 dark:bg-blue-950/40" />
                <DashCard icon={GraduationCap} label="المحاضرات" value={stats.content.lectures} sub={`${stats.content.modules} موديول`} color="text-purple-600 bg-purple-50 dark:bg-purple-950/40" />
                <DashCard icon={BarChart3} label="اختبارات مكتملة" value={stats.quizzes.attempts} sub={`${stats.quizzes.correct}/${stats.quizzes.answers} صحيحة`} color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" />
                <DashCard icon={CreditCard} label="اشتراكات نشطة" value={stats.subscriptions.active} sub={`${stats.recentActivity.last7Days} اختبار آخر 7 أيام`} color="text-amber-600 bg-amber-50 dark:bg-amber-950/40" />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Modules */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">أكثر الموديولات استخداماً</h3>
                  {stats.topModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد اختبارات بعد.</p>
                  ) : (
                    <ul className="space-y-3">
                      {stats.topModules.map((m) => (
                        <li key={m.slug}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground">{m.attempts} اختبار</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${(m.attempts / (stats.topModules[0]?.attempts || 1)) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Top Users */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="mb-4 font-semibold">أكثر المستخدمين نشاطاً</h3>
                  {stats.topUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا يوجد مستخدمين بعد.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.topUsers.map((u) => (
                        <div key={u.email} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{u.quizzes} اختبار</p>
                            <p className="text-xs text-muted-foreground">{u.accuracy}% صحة</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">جاري التحميل...</p>
            </div>
          )}
        </div>
      )}

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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">المستخدمين</h2>
            <Button size="sm" variant="outline" onClick={fetchUsers} disabled={usersLoading}>تحديث</Button>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            إدارة المستخدمين والاشتراكات من صفحة الإدارة الرئيسية.
          </p>
          <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <Users className="h-4 w-4" />
            الانتقال للإدارة الرئيسية
          </Link>

          {usersList.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">أكثر المستخدمين نشاطاً في الاختبارات</h3>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">المستخدم</th>
                      <th className="px-4 py-3 text-start font-medium text-muted-foreground">البريد</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">اختبارات</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">نسبة الصحة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => (
                      <tr key={u.email} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-center">{u.quizzes}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.accuracy >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                            u.accuracy >= 50 ? "bg-amber-500/10 text-amber-600" :
                            "bg-red-500/10 text-red-600"
                          }`}>
                            {u.accuracy}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

function DashCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
