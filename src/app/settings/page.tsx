import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const settings = [
  { title: "ข้อมูลร้าน", description: "ชื่อร้าน โลโก้ เบอร์โทร และช่องทางติดต่อ" },
  { title: "การจัดส่ง", description: "ค่าจัดส่งขั้นต่ำ พื้นที่บริการ และเวลาจัดเตรียมสินค้า" },
  { title: "การชำระเงิน", description: "PromptPay เก็บเงินปลายทาง และการตรวจหลักฐาน" },
  { title: "LINE LIFF", description: "LIFF ID, Channel ID และสถานะการเชื่อมต่อ" },
  { title: "การแจ้งเตือน", description: "ออเดอร์ใหม่ สลิปรอตรวจ และสินค้าสต็อกต่ำ" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="การตั้งค่า"
        title="ตั้งค่าระบบ"
        description="ตั้งค่าหน้าร้าน การชำระเงิน การจัดส่ง และการเชื่อมต่อ LINE LIFF"
      />
      <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-2">
          {settings.map((setting, index) => (
            <button
              key={setting.title}
              className={`w-full rounded-lg p-4 text-left transition ring-1 ${
                index === 0
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-border hover:bg-muted/50"
              }`}
            >
              <p className="font-semibold">{setting.title}</p>
              <p
                className={`mt-1 text-xs leading-5 ${
                  index === 0 ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {setting.description}
              </p>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลร้าน</CardTitle>
            <p className="text-sm text-muted-foreground">
              ข้อมูลนี้จะแสดงบนหน้าร้านและเอกสารออเดอร์
            </p>
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
      </section>
    </div>
  );
}
