"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "setup";

type ApiErrorBody = {
  code?: string;
  errorCode?: string;
  error?: string;
  message?: string;
  paths?: string[];
  rawText?: string;
  status?: number;
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
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

        const { paths, response: registerResponse } = await registerFirstAdmin({
          displayName: displayName.trim() || "PonPon Admin",
          email: email.trim(),
          password,
        });

        if (!registerResponse.ok) {
          const body = { ...(await readApiError(registerResponse)), paths };

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
          setMode("setup");
          setError("ยังไม่มีบัญชี Admin ในระบบ กรุณาสร้าง Admin คนแรกเพื่อเริ่มใช้งาน");
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

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={`rounded-md px-3 py-2 text-sm font-bold transition ${
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("setup");
            setError("");
          }}
          className={`rounded-md px-3 py-2 text-sm font-bold transition ${
            mode === "setup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ตั้งค่า Admin
        </button>
      </div>

      {mode === "setup" ? (
        <div className="space-y-2">
          <Label htmlFor="displayName">ชื่อผู้ดูแล</Label>
          <Input
            id="displayName"
            type="text"
            name="displayName"
            autoComplete="name"
            defaultValue="PonPon Admin"
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
            ใช้ได้เฉพาะตอนที่ระบบยังไม่มี user role Admin และรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร
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
  const paths = [
    "/api/backend/admin/auth/register-first-admin",
    "/api/backend/auth/register-first-admin",
  ];

  for (const path of paths) {
    const response = await fetch(path, {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    if (response.status !== 404 || path === paths[paths.length - 1]) {
      return { paths: paths.slice(0, paths.indexOf(path) + 1), response };
    }
  }

  throw new Error("register-first-admin endpoint not found");
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
    body.status === 404 && body.paths?.length ? `tried ${body.paths.join(" -> ")}` : "",
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
