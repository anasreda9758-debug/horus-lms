"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Props = {
  user: { name: string; email: string; role: string; createdAt: Date };
  profile: { level: number; totalXp: number; streak: number; battlesWon: number; battlesLost: number };
  subscription: { planName: string; expiresAt: Date } | null;
};

export function SettingsForm({ user, profile, subscription }: Props) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveName() {
    if (!name.trim() || name.trim() === user.name) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setMsg({ type: "ok", text: t("Name updated", "تم تحديث الاسم") });
        router.refresh();
      } else {
        setMsg({ type: "err", text: t("Update failed", "فشل التحديث") });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${msg.type === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
          {msg.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* Profile Info */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("Profile", "المعلومات الشخصية")}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">{t("Name", "الاسم")}</label>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button size="sm" onClick={saveName} disabled={busy || !name.trim() || name.trim() === user.name}>
                <Save className="ml-1 h-3.5 w-3.5" />
                {t("Save", "حفظ")}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t("Email", "البريد الإلكتروني")}</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm opacity-60"
              value={user.email}
              disabled
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t("Role", "الدور")}</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm opacity-60"
              value={user.role === "admin" ? t("Administrator", "مدير") : t("Student", "طالب")}
              disabled
            />
          </div>
        </div>
      </section>

      {/* Stats Summary */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("Account summary", "ملخص الحساب")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("Level", "المستوى")}</p>
            <p className="text-lg font-bold">{profile.level}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Experience", "الخبرة")}</p>
            <p className="text-lg font-bold">{profile.totalXp} XP</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Streak", "الستريك")}</p>
            <p className="text-lg font-bold">{t(`${profile.streak} days`, `${profile.streak} يوم`)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("Joined", "تاريخ التسجيل")}</p>
            <p className="text-lg font-bold">{user.createdAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}</p>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("Subscription", "الاشتراك")}</h2>
        {subscription ? (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 p-4">
            <div>
              <p className="font-medium text-emerald-600">{subscription.planName}</p>
              <p className="text-xs text-muted-foreground">
                {t("Ends", "ينتهي في")} {subscription.expiresAt.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US")}
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">{t("Active", "نشط")}</span>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">{t("You do not have an active subscription.", "ليس لديك اشتراك نشط.")}</p>
            <Button size="sm" className="mt-2" onClick={() => router.push("/pricing")}>{t("View plans", "اشترك الآن")}</Button>
          </div>
        )}
      </section>
    </div>
  );
}
