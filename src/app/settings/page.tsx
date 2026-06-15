import { PageHeader } from "@/components/page-header";

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
      <PageHeader eyebrow="Configuration" title="ตั้งค่าระบบ" description="ตั้งค่าหน้าร้าน การชำระเงิน การจัดส่ง และการเชื่อมต่อ LINE LIFF" />
      <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">{settings.map((setting, index) => <button key={setting.title} className={`w-full rounded-3xl p-4 text-left shadow-sm ring-1 transition ${index === 0 ? "bg-red-600 text-white ring-red-600" : "bg-white text-zinc-900 ring-red-100 hover:bg-red-50"}`}><p className="font-black">{setting.title}</p><p className={`mt-1 text-xs leading-5 ${index === 0 ? "text-white/70" : "text-zinc-500"}`}>{setting.description}</p></button>)}</div>
        <form className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
          <h2 className="text-lg font-black">ข้อมูลร้าน</h2><p className="mt-1 text-sm text-zinc-500">ข้อมูลนี้จะแสดงบนหน้าร้านและเอกสารออเดอร์</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-xs font-black">ชื่อร้าน</span><input defaultValue="PonPon Shop" className="h-11 w-full rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none focus:ring-2 focus:ring-red-200" /></label>
            <label className="space-y-2"><span className="text-xs font-black">เบอร์โทร</span><input defaultValue="081-234-5678" className="h-11 w-full rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none focus:ring-2 focus:ring-red-200" /></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-black">LINE Official URL</span><input defaultValue="https://line.me/R/ti/p/@ponpon" className="h-11 w-full rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none focus:ring-2 focus:ring-red-200" /></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-black">ที่อยู่ร้าน</span><textarea defaultValue="88 อาคาร PonPon ชั้น 12 กรุงเทพฯ 10310" className="min-h-28 w-full rounded-2xl bg-[#fff8f6] p-4 text-sm outline-none focus:ring-2 focus:ring-red-200" /></label>
          </div>
          <div className="mt-5 flex justify-end"><button type="button" className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20">บันทึกการตั้งค่า</button></div>
        </form>
      </section>
    </div>
  );
}
