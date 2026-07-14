"use client";

import { useState } from "react";
import { AdminUsersManager } from "@/components/admin-users-manager";
import {
  hasPermission,
  useAdminSession,
  type AdminPermission,
} from "@/components/admin-permissions";
import { IntegrationsSettingsForm } from "@/components/integrations-settings-form";
import { PageHeader } from "@/components/page-header";
import { ShippopSenderForm } from "@/components/shippop-sender-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const settings: Array<{
  id: string;
  title: string;
  description: string;
  permission: AdminPermission;
}> = [
  { id: "store", title: "ข้อมูลร้าน", description: "ชื่อร้าน โลโก้ เบอร์โทร และช่องทางติดต่อ", permission: "settings.manage" },
  { id: "shipping", title: "ผู้ส่ง SHIPPOP", description: "ชื่อ เบอร์โทร อีเมล และที่อยู่ต้นทางสำหรับจัดส่ง", permission: "settings.manage" },
  { id: "payment", title: "การชำระเงิน", description: "PromptPay เก็บเงินปลายทาง และการตรวจหลักฐาน", permission: "settings.manage" },
  { id: "line", title: "LINE LIFF", description: "LIFF ID, Channel ID และสถานะการเชื่อมต่อ", permission: "settings.manage" },
  { id: "notifications", title: "การแจ้งเตือน", description: "ออเดอร์ใหม่ สลิปรอตรวจ และสินค้าสต็อกต่ำ", permission: "settings.manage" },
  { id: "integrations", title: "Integrations", description: "LINE, ZORT Webhook, SHIPPOP, OMISE และ SUPABASE", permission: "integrations.read" },
  { id: "admins", title: "ผู้ดูแลระบบ", description: "สร้างบัญชี กำหนด Role และสิทธิ์การใช้งาน", permission: "admin_users.read" },
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
  const { user } = useAdminSession();
  const [activeId, setActiveId] = useState("store");
  const visibleSettings = settings.filter((setting) =>
    hasPermission(user, setting.permission),
  );
  const activeSetting =
    visibleSettings.find((setting) => setting.id === activeId) ??
    visibleSettings[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="การตั้งค่า"
        title="ตั้งค่าระบบ"
        description="ตั้งค่าหน้าร้าน การชำระเงิน การจัดส่ง และการเชื่อมต่อ LINE LIFF"
      />
      <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-2">
          {visibleSettings.map((setting) => (
            <button
              key={setting.id}
              type="button"
              onClick={() => setActiveId(setting.id)}
              className={`w-full rounded-lg p-4 text-left transition ring-1 ${
                activeSetting?.id === setting.id
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold">{setting.title}</p>
              <p
                className={`mt-1 text-xs leading-5 ${
                  activeSetting?.id === setting.id ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {setting.description}
              </p>
            </button>
          ))}
        </div>

        <div>
          {activeSetting?.id === "store" && <StoreForm />}
          {activeSetting?.id === "shipping" && <ShippopSenderForm />}
          {activeSetting?.id === "integrations" && <IntegrationsSettingsForm />}
          {activeSetting?.id === "admins" && <AdminUsersManager />}
          {activeSetting && activeSetting.id !== "store" && activeSetting.id !== "shipping" && activeSetting.id !== "integrations" && activeSetting.id !== "admins" && (
            <PlaceholderForm title={activeSetting.title} />
          )}
        </div>
      </section>
    </div>
  );
}
