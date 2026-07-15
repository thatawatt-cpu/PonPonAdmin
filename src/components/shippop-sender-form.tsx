"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { hasPermission, useAdminSession } from "@/components/admin-permissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const SENDER_API_PATH = "/api/backend/admin/shipping/sender";

type SenderFields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  state: string;
  province: string;
  postcode: string;
};

type SenderResponse = Partial<SenderFields> & {
  isConfigured?: boolean;
};

type Feedback = {
  kind: "success" | "error";
  message: string;
};

const EMPTY_SENDER: SenderFields = {
  name: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  state: "",
  province: "",
  postcode: "",
};

export function ShippopSenderForm() {
  const { user } = useAdminSession();
  const canManage = hasPermission(user, "settings.manage");
  const [sender, setSender] = useState<SenderFields>(EMPTY_SENDER);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSender() {
      try {
        const response = await fetch(SENDER_API_PATH, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await responseErrorMessage(response));
        }

        const data = (await response.json()) as SenderResponse;

        if (!controller.signal.aborted) {
          setSender(senderFieldsFrom(data));
          setIsConfigured(Boolean(data.isConfigured));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFeedback({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "ไม่สามารถโหลดข้อมูลผู้ส่ง SHIPPOP ได้",
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSender();

    return () => controller.abort();
  }, []);

  function updateField(field: keyof SenderFields, value: string) {
    setSender((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      setFeedback({
        kind: "error",
        message: "บัญชีนี้ไม่มีสิทธิ์จัดการตั้งค่าผู้ส่ง SHIPPOP",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload = Object.fromEntries(
      Object.entries(sender).map(([key, value]) => [key, value.trim()]),
    ) as SenderFields;

    try {
      const response = await fetch(SENDER_API_PATH, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await responseErrorMessage(response));
      }

      const data = (await response.json()) as SenderResponse;
      setSender(senderFieldsFrom(data));
      setIsConfigured(Boolean(data.isConfigured));
      setFeedback({
        kind: "success",
        message: "บันทึกข้อมูลผู้ส่ง SHIPPOP สำเร็จ",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถบันทึกข้อมูลผู้ส่ง SHIPPOP ได้",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle>ผู้ส่ง SHIPPOP</CardTitle>
            <p className="text-sm text-muted-foreground">
              ข้อมูลต้นทางที่ใช้สร้างรายการจัดส่งและเรียกรถเข้ารับพัสดุ
            </p>
          </div>
          {!isLoading ? (
            <Badge
              variant={isConfigured ? "secondary" : "outline"}
              className={
                isConfigured
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : ""
              }
            >
              {isConfigured ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
            role="status"
          >
            <Spinner />
            กำลังโหลดข้อมูลผู้ส่ง…
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isConfigured && feedback?.kind !== "error" ? (
              <Alert>
                <Info />
                <AlertDescription>
                  ยังไม่มีข้อมูลผู้ส่ง กรุณากรอกข้อมูลให้ครบก่อนใช้งาน SHIPPOP
                </AlertDescription>
              </Alert>
            ) : null}

            <fieldset
              className="grid gap-4 sm:grid-cols-2"
              disabled={isSaving || !canManage}
            >
              <div className="space-y-2">
                <Label htmlFor="shippop-sender-name">ชื่อผู้ส่ง/ร้าน</Label>
                <Input
                  id="shippop-sender-name"
                  value={sender.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoComplete="organization"
                  placeholder="PonPon Shop"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippop-sender-phone">เบอร์โทร</Label>
                <Input
                  id="shippop-sender-phone"
                  type="tel"
                  value={sender.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]{9,10}"
                  title="กรุณากรอกหมายเลขโทรศัพท์ 9–10 หลักโดยไม่ใส่ขีด"
                  placeholder="0812345678"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shippop-sender-email">อีเมล</Label>
                <Input
                  id="shippop-sender-email"
                  type="email"
                  value={sender.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  autoComplete="email"
                  placeholder="sender@example.com"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shippop-sender-address">ที่อยู่</Label>
                <Textarea
                  id="shippop-sender-address"
                  value={sender.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  autoComplete="street-address"
                  placeholder="บ้านเลขที่ ถนน"
                  className="min-h-24"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippop-sender-district">อำเภอ/เขต</Label>
                <Input
                  id="shippop-sender-district"
                  value={sender.district}
                  onChange={(event) =>
                    updateField("district", event.target.value)
                  }
                  autoComplete="address-level2"
                  placeholder="คลองเตย"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippop-sender-state">ตำบล/แขวง</Label>
                <Input
                  id="shippop-sender-state"
                  value={sender.state}
                  onChange={(event) => updateField("state", event.target.value)}
                  autoComplete="address-level3"
                  placeholder="คลองเตย"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippop-sender-province">จังหวัด</Label>
                <Input
                  id="shippop-sender-province"
                  value={sender.province}
                  onChange={(event) =>
                    updateField("province", event.target.value)
                  }
                  autoComplete="address-level1"
                  placeholder="กรุงเทพมหานคร"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippop-sender-postcode">รหัสไปรษณีย์</Label>
                <Input
                  id="shippop-sender-postcode"
                  value={sender.postcode}
                  onChange={(event) =>
                    updateField("postcode", event.target.value)
                  }
                  autoComplete="postal-code"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  title="กรุณากรอกรหัสไปรษณีย์ 5 หลัก"
                  placeholder="10110"
                  required
                />
              </div>
            </fieldset>

            {feedback ? (
              <Alert
                variant={feedback.kind === "error" ? "destructive" : "default"}
                className={
                  feedback.kind === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                    : undefined
                }
              >
                {feedback.kind === "success" ? <CheckCircle2 /> : null}
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            ) : null}

            {!canManage ? (
              <Alert>
                <Info />
                <AlertDescription>
                  บัญชีนี้ดูข้อมูลผู้ส่ง SHIPPOP ได้ แต่ไม่มีสิทธิ์แก้ไขหรือบันทึก
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving || !canManage}>
                {isSaving ? (
                  <>
                    <Spinner />
                    กำลังบันทึก…
                  </>
                ) : (
                  "บันทึกข้อมูลผู้ส่ง"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function senderFieldsFrom(data: SenderResponse): SenderFields {
  return {
    name: data.name ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    district: data.district ?? "",
    state: data.state ?? "",
    province: data.province ?? "",
    postcode: data.postcode ?? "",
  };
}

async function responseErrorMessage(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    detail?: string;
    message?: string;
    title?: string;
  } | null;

  if (response.status === 401) {
    return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  }

  return (
    data?.message ??
    data?.detail ??
    data?.title ??
    `เกิดข้อผิดพลาด (${response.status})`
  );
}
