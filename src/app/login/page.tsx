import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "ผู้ดูแลระบบ | PonPon Admin",
  description: "เข้าสู่ระบบหรือตั้งค่าผู้ดูแลคนแรกสำหรับร้าน PonPon",
};

const activity = [
  { label: "ออเดอร์วันนี้", value: "36" },
  { label: "รอตรวจสลิป", value: "8" },
  { label: "สินค้าใกล้หมด", value: "5" },
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-zinc-900 px-10 py-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.06),transparent_24rem),radial-gradient(circle_at_90%_85%,rgba(0,0,0,0.3),transparent_28rem)]" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-base font-black text-zinc-900 shadow-lg">
              PP
            </span>
            <div>
              <p className="text-base font-semibold">PonPon Admin</p>
              <p className="text-xs text-white/60">
                ระบบจัดการร้านค้า
              </p>
            </div>
          </div>

          <div className="relative max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
              ระบบหลังร้าน
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[1.02]">
              จัดการทุกออเดอร์ก่อนร้านยุ่ง
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">
              ตรวจสลิป อัปเดตสต็อก และเตรียมโปรโมชันจากศูนย์กลางจัดการที่สร้างมาเพื่อ PonPon โดยเฉพาะ
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {activity.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/8 p-4 ring-1 ring-white/12 backdrop-blur"
              >
                <p className="text-2xl font-black">{item.value}</p>
                <p className="mt-1 text-xs text-white/60">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[440px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                PP
              </span>
              <div>
                <p className="text-base font-semibold">PonPon Admin</p>
                <p className="text-xs text-muted-foreground">
                  ระบบจัดการร้านค้า
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <LoginForm />
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              พื้นที่สำหรับผู้ดูแลร้าน PonPon เท่านั้น
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
