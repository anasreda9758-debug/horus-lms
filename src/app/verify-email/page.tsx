"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 1)}***@${domain}`;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(searchParams.get("email") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          type: "email-verification",
        }),
      });
      if (!response.ok) throw new Error("تعذر إرسال رمز التحقق");
      setSent(true);
      setResendIn(60);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال رمز التحقق");
    } finally {
      setLoading(false);
    }

  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email-otp/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp,
        }),
      });
      const result = (await response.json()) as { message?: string; error?: { message?: string } };
      if (!response.ok) {
        throw new Error(result.error?.message ?? result.message ?? "رمز التحقق غير صحيح");
      }

      setVerified(true);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{verified ? "تم تأكيد البريد الإلكتروني" : "تحقق من بريدك الإلكتروني"}</CardTitle>
          <CardDescription>
            {verified
              ? "تم التأكيد. سجّل الدخول للمتابعة."
              : "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني."}
          </CardDescription>
        </CardHeader>
        {verified ? (
          <CardFooter>
            <Link href="/sign-in" className="w-full">
              <Button className="w-full">تسجيل الدخول</Button>
            </Link>
          </CardFooter>
        ) : (
          <form onSubmit={sent ? verify : sendCode}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="verification-email">البريد الإلكتروني</Label>
                <Input
                  id="verification-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {sent ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    أرسلنا رمز التحقق إلى {maskEmail(email)}.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="verification-code">رمز التحقق</Label>
                    <Input
                      id="verification-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(event) =>
                        setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                </>
              ) : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button type="submit" className="w-full" disabled={loading || (sent && otp.length !== 6)}>
                {sent ? "تأكيد البريد الإلكتروني" : "إرسال رمز التحقق"}
              </Button>
              {sent ? (
                <Button type="button" variant="link" disabled={resendIn > 0 || loading} onClick={() => void sendCode()}>
                  {resendIn > 0 ? `إعادة الإرسال خلال ${resendIn}ث` : "إعادة إرسال الرمز"}
                </Button>
              ) : null}
              <Link href="/sign-in" className="text-sm underline">
                العودة لتسجيل الدخول
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
