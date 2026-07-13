"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { IntegrationsSettingsForm } from "@/components/integrations-settings-form";
import { ShippopSenderForm } from "@/components/shippop-sender-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const settings = [
  { id: "store", title: "ข้อมูลร้าน", description: "ชื่อร้าน โลโก้ เบอร์โทร และช่องทางติดต่อ" },
  { id: "shipping", title: "ผู้ส่ง SHIPPOP", description: "ชื่อ เบอร์โทร อีเมล และที่อยู่ต้นทางสำหรับจัดส่ง" },
  { id: "payment", title: "การชำระเงิน", description: "PromptPay เก็บเงินปลายทาง และการตรวจหลักฐาน" },
  { id: "line", title: "LINE LIFF", description: "LIFF ID, Channel ID และสถานะการเชื่อมต่อ" },
  { id: "notifications", title: "การแจ้งเตือน", description: "ออเดอร์ใหม่ สลิปรอตรวจ และสินค้าสต็อกต่ำ" },
  { id: "integrations", title: "Integrations", description: "LINE, ZORT, SHIPPOP, OMISE และ SUPABASE API keys" },
  { id: "zort", title: "Zort", description: "Webhook URL และ API Keys สำหรับเชื่อมต่อ Zort" },
];

function StoreForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ข้อมูลร้าน</CardTitle>
        <p className="text-sm text-muted-foreground">ข้อมูลนี้จะแสดงบนหน้าร้านและเอกสารออเดอร์</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ชื่อร้าน</Label>
            <Input defaultValue="PonPon Shop" />
          </div>
          <div className="space-y-2">
            <Label>เบอร์โทร</Label>
            <Input defaultValue="081-234-5678" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>LINE Official URL</Label>
            <Input defaultValue="https://line.me/R/ti/p/@ponpon" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>ที่อยู่ร้าน</Label>
            <textarea
              defaultValue="88 อาคาร PonPon ชั้น 12 กรุงเทพฯ 10310"
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button type="button">บันทึกการตั้งค่า</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ZortForm() {
  const [baseUrl, setBaseUrl] = useState("");
  const [key1, setKey1] = useState("");
  const [key2, setKey2] = useState("");
  const [key3, setKey3] = useState("");
  const [fetching, setFetching] = useState(true);
  const [zortData, setZortData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/backend/admin/settings/zort/webhook").then((r) => r.json()).catch(() => ({})),
      fetch("/api/backend/admin/settings/zort/webhook-from-zort").then((r) => r.json()).catch(() => null),
    ]).then(([our, zort]) => {
      setBaseUrl(our.baseUrl ?? "");
      setKey1(our.key1 ?? "");
      setKey2(our.key2 ?? "");
      setKey3(our.key3 ?? "");
      setZortData(zort);
    }).finally(() => setFetching(false));
  }, []);

  async function handleSave() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/backend/admin/settings/zort/register-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: baseUrl || null,
          key1: key1 || null,
          key2: key2 || null,
          key3: key3 || null,
        }),
      });
      if (res.ok) {
        setResult({ ok: true, message: "บันทึกการตั้งค่า Zort สำเร็จ" });
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, message: err?.message ?? `เกิดข้อผิดพลาด (${res.status})` });
      }
    } catch {
      setResult({ ok: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          กำลังโหลดการตั้งค่า…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zort Webhook</CardTitle>
        <p className="text-sm text-muted-foreground">
          ตั้งค่า Base URL และ API Keys สำหรับเชื่อมต่อระบบ Zort
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="zort-base-url">Base URL</Label>
            <Input
              id="zort-base-url"
              placeholder="https://api.ponpon.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zort-key1">Key 1</Label>
            <Input
              id="zort-key1"
              type="password"
              value={key1}
              onChange={(e) => setKey1(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zort-key2">
              Key 2 <span className="text-muted-foreground">(ไม่บังคับ)</span>
            </Label>
            <Input
              id="zort-key2"
              type="password"
              placeholder="—"
              value={key2}
              onChange={(e) => setKey2(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zort-key3">
              Key 3 <span className="text-muted-foreground">(ไม่บังคับ)</span>
            </Label>
            <Input
              id="zort-key3"
              type="password"
              placeholder="—"
              value={key3}
              onChange={(e) => setKey3(e.target.value)}
            />
          </div>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" className="mt-4 w-full" disabled={zortData === null} />
            }
          >
            ดูข้อมูล Webhook จาก Zort
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Webhook จาก Zort</DialogTitle>
              <DialogDescription>
                ข้อมูลที่ได้รับจาก GET /api/admin/settings/zort/webhook-from-zort
              </DialogDescription>
            </DialogHeader>
            {!zortData || Object.keys(zortData).length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>
            ) : (() => {
              const urlEntries = Object.entries(zortData).filter(([k]) => k.toLowerCase().endsWith("url"));
              const keyEntries = Object.entries(zortData).filter(([k]) => !k.toLowerCase().endsWith("url"));
              return (
                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                  {keyEntries.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keys</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/60">
                              <th className="w-52 px-4 py-2.5 text-left font-semibold text-foreground">Key</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-foreground">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {keyEntries.map(([k, v]) => (
                              <tr key={k} className="hover:bg-muted/30 transition-colors">
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{k}</td>
                                <td className="px-4 py-2.5 font-mono text-xs break-all">
                                  {v == null ? <span className="text-muted-foreground">—</span> : String(v)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {urlEntries.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webhooks</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/60">
                              <th className="w-52 px-4 py-2.5 text-left font-semibold text-foreground">Event</th>
                              <th className="px-4 py-2.5 text-left font-semibold text-foreground">URL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {urlEntries.map(([k, v]) => (
                              <tr key={k} className="hover:bg-muted/30 transition-colors">
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">{k}</td>
                                <td className="px-4 py-2.5 font-mono text-xs break-all">
                                  {v == null ? <span className="text-muted-foreground">—</span> : String(v)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {result && (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              result.ok
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {result.message}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlaceholderForm({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">ยังไม่ได้ตั้งค่าในส่วนนี้</p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [activeId, setActiveId] = useState("store");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="การตั้งค่า"
        title="ตั้งค่าระบบ"
        description="ตั้งค่าหน้าร้าน การชำระเงิน การจัดส่ง และการเชื่อมต่อ LINE LIFF"
      />
      <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-2">
          {settings.map((setting) => (
            <button
              key={setting.id}
              onClick={() => setActiveId(setting.id)}
              className={`w-full rounded-lg p-4 text-left transition ring-1 ${
                activeId === setting.id
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold">{setting.title}</p>
              <p
                className={`mt-1 text-xs leading-5 ${
                  activeId === setting.id ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {setting.description}
              </p>
            </button>
          ))}
        </div>

        <div>
          {activeId === "store" && <StoreForm />}
          {activeId === "shipping" && <ShippopSenderForm />}
          {activeId === "integrations" && <IntegrationsSettingsForm />}
          {activeId === "zort" && <ZortForm />}
          {activeId !== "store" && activeId !== "shipping" && activeId !== "integrations" && activeId !== "zort" && (
            <PlaceholderForm title={settings.find((s) => s.id === activeId)?.title ?? ""} />
          )}
        </div>
      </section>
    </div>
  );
}
