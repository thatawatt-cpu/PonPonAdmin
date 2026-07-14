"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type AuthMode = "login" | "setup";

type ApiErrorBody = {
  code?: string;
  errorCode?: string;
  error?: string;
  message?: string;
  rawText?: string;
  status?: number;
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusReloadKey, setStatusReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSetupStatus() {
      try {
        const response = await fetch("/api/backend/admin/auth/setup-status", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Cannot load admin setup status");
        }

        const body = (await response.json()) as { hasAdmin?: unknown };
        if (typeof body.hasAdmin !== "boolean") {
          throw new Error("Invalid admin setup status");
        }

        if (active) {
          setMode(body.hasAdmin ? "login" : "setup");
          setStatusError("");
          setError("");
        }
      } catch {
        if (active) {
          setMode(null);
          setStatusError("ตรวจสอบสถานะผู้ดูแลระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      }
    }

    void loadSetupStatus();

    return () => {
      active = false;
    };
  }, [statusReloadKey]);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    try {
      if (mode === "setup") {
        if (password.length < 8) {
          setError("รหัสผ่านสั้นเกินไป กรุณาใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร");
          return;
        }

        const registerResponse = await registerFirstAdmin({
          displayName: displayName.trim() || "PonPon Admin",
          email: email.trim(),
          password,
        });

        if (!registerResponse.ok) {
          const body = await readApiError(registerResponse);

          if (isAdminAlreadyExists(body)) {
            setMode("login");
            setError("ระบบมีบัญชีผู้ดูแลอยู่แล้ว กรุณาเข้าสู่ระบบด้วยบัญชี Admin ของคุณ");
            return;
          }

          setError(formatApiError(body, "ยังสร้าง Admin คนแรกไม่ได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง"));
          return;
        }
      }

      const loginResponse = await login(email, password);

      if (!loginResponse.ok) {
        const body = await readApiError(loginResponse);

        if (isFirstAdminRequired(body)) {
          setMode(null);
          setStatusReloadKey((current) => current + 1);
          return;
        }

        setError(formatApiError(body, "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่านอีกครั้ง"));
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("ยังเชื่อมต่อระบบหลังบ้านไม่ได้ กรุณาตรวจสอบว่า backend เปิดอยู่ แล้วลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (!mode) {
    return (
      <div className="min-h-64">
        <AuthHeading
          title={statusError ? "ยังเปิดหน้าผู้ดูแลไม่ได้" : "กำลังเตรียมระบบ"}
          description={
            statusError
              ? "ระบบยังตรวจสอบสถานะผู้ดูแลไม่สำเร็จ"
              : "กำลังตรวจสอบว่าร้านมีบัญชีผู้ดูแลแล้วหรือยัง"
          }
        />
        {statusError ? (
          <div className="mt-6 space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{statusError}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setStatusError("");
                setStatusReloadKey((current) => current + 1);
              }}
            >
              ลองใหม่
            </Button>
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center" role="status">
            <Spinner className="size-6 text-muted-foreground" />
            <span className="sr-only">กำลังตรวจสอบสถานะผู้ดูแล</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        title={mode === "setup" ? "สร้างผู้ดูแลคนแรก" : "เข้าสู่ระบบ"}
        description={
          mode === "setup"
            ? "ตั้งค่าบัญชี Admin เพื่อเริ่มจัดการร้าน PonPon"
            : "ใช้อีเมลและรหัสผ่านของผู้ดูแลร้าน"
        }
      />

      <form className="mt-6 space-y-4" onSubmit={submit}>
        {mode === "setup" ? (
          <div className="space-y-2">
            <Label htmlFor="displayName">ชื่อผู้ดูแล</Label>
            <Input
              id="displayName"
              type="text"
              name="displayName"
              autoComplete="name"
              defaultValue="PonPon Admin"
              required
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete={mode === "setup" ? "new-password" : "current-password"}
            minLength={mode === "setup" ? 8 : undefined}
            required
          />
          {mode === "setup" ? (
            <p className="text-xs leading-5 text-muted-foreground">
              รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร บัญชีนี้จะเป็นผู้ดูแลคนแรกของระบบ
            </p>
          ) : null}
        </div>

        {mode === "login" ? (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
              />
              จดจำฉัน
            </label>
            <a href="mailto:support@ponpon.co" className="text-sm font-medium underline underline-offset-4 hover:text-foreground">
              ลืมรหัสผ่าน
            </a>
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? mode === "setup"
              ? "กำลังสร้าง Admin..."
              : "กำลังเข้าสู่ระบบ..."
            : mode === "setup"
              ? "สร้าง Admin และเข้าสู่ระบบ"
              : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </div>
  );
}

function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        PonPon Admin
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function login(email: string, password: string) {
  return fetch("/api/backend/admin/auth/login", {
    body: JSON.stringify({ email: email.trim(), password }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function registerFirstAdmin(payload: {
  displayName: string;
  email: string;
  password: string;
}) {
  return fetch("/api/backend/admin/auth/register-first-admin", {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function readApiError(response: Response): Promise<ApiErrorBody> {
  const status = response.status;

  try {
    const rawText = await response.text();

    if (!rawText) {
      return { status };
    }

    try {
      const data = JSON.parse(rawText) as ApiErrorBody;
      return { ...data, rawText, status };
    } catch {
      return { message: rawText, rawText, status };
    }
  } catch {
    return { status };
  }
}

function isFirstAdminRequired(body: ApiErrorBody) {
  const code = errorCode(body);
  const message = errorText(body);

  return (
    code === "admin_required" ||
    code === "admin_not_found" ||
    code === "no_admin" ||
    code === "first_admin_required" ||
    message.includes("no admin") ||
    message.includes("first admin")
  );
}

function isAdminAlreadyExists(body: ApiErrorBody) {
  const code = errorCode(body);
  const message = errorText(body);

  return code === "admin_already_exists" || message.includes("admin_already_exists");
}

function formatApiError(body: ApiErrorBody, fallback: string) {
  const code = errorCode(body);
  const message = friendlyErrorMessage(body, fallback);
  const details = diagnosticDetails(body, code, message);

  return details.length > 0 ? `${message} (${details.join(", ")})` : message;
}

function friendlyErrorMessage(body: ApiErrorBody, fallback: string) {
  const code = errorCode(body);
  const text = errorText(body);

  if (body.status === 401 || body.status === 403) {
    return "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่านอีกครั้ง";
  }

  if (body.status === 404) {
    return "ยังไม่พบ endpoint สำหรับขั้นตอนนี้ กรุณาตรวจสอบ backend ที่กำลังรันอยู่";
  }

  if (code.includes("password") || text.includes("password")) {
    return "รหัสผ่านไม่ผ่านเงื่อนไข กรุณาใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร";
  }

  if (code.includes("email") || text.includes("email")) {
    return "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง";
  }

  return body.message || fallback;
}

function diagnosticDetails(body: ApiErrorBody, code: string, message: string) {
  if (!body.status || [400, 401, 403].includes(body.status)) {
    return [];
  }

  return [
    `HTTP ${body.status}`,
    code && code !== message.toLowerCase() ? code : "",
  ].filter(Boolean);
}

function errorCode(body: ApiErrorBody) {
  return String(body.code ?? body.errorCode ?? body.error ?? "").toLowerCase();
}

function errorText(body: ApiErrorBody) {
  return String(
    `${body.message ?? ""} ${body.error ?? ""} ${body.rawText ?? ""}`,
  ).toLowerCase();
}
