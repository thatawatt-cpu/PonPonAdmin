import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { adminProducts, type SyncStatus } from "@/lib/admin-data";

const statusStyle: Record<SyncStatus, string> = {
  synced: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

const statusLabel: Record<SyncStatus, string> = {
  synced: "ซิงก์แล้ว",
  pending: "รอจับคู่",
  error: "ต้องตรวจสอบ",
};

export default function ZortIntegrationPage() {
  const synced = adminProducts.filter((product) => product.syncStatus === "synced").length;
  const pending = adminProducts.filter((product) => product.syncStatus === "pending").length;
  const errors = adminProducts.filter((product) => product.syncStatus === "error").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integration"
        title="ZORT POS Sync"
        description="ตรวจสถานะการนำเข้าข้อมูลจาก ZORT และแยกข้อมูลที่ PonPon ต้องดูแลเอง"
        action={
          <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20">
            ซิงก์ข้อมูลตอนนี้
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="การเชื่อมต่อ" value="พร้อมใช้งาน" tone="green" detail="ข้อมูลตัวอย่าง ยังไม่เรียก API จริง" />
        <Metric label="ซิงก์สำเร็จ" value={`${synced} รายการ`} tone="green" detail="ราคาและสต็อกเป็นข้อมูลล่าสุด" />
        <Metric label="รอจับคู่ SKU" value={`${pending} รายการ`} tone="amber" detail="ต้องผูกตัวเลือกหน้าร้าน" />
        <Metric label="พบปัญหา" value={`${errors} รายการ`} tone="red" detail="ตรวจ payload หรือ SKU ซ้ำ" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <OwnershipCard
          title="ข้อมูลที่ ZORT เป็นเจ้าของ"
          description="แสดงแบบอ่านอย่างเดียวใน PonPon และจะถูกเขียนทับเมื่อซิงก์"
          items={[
            "ZORT Product ID, SKU และ Barcode",
            "ชื่อสินค้าต้นทางและราคาขาย",
            "สต็อกรวม สต็อกแต่ละตัวเลือก และสถานะหมด",
            "ยอดขาย ออเดอร์ การชำระเงิน และสถานะจัดส่ง",
            "ข้อมูลลูกค้าที่แนบมากับออเดอร์ ถ้า API ส่งมา",
          ]}
        />
        <OwnershipCard
          title="ข้อมูลที่ต้องกรอกใน PonPon"
          description="ZORT ไม่มีข้อมูลเพื่อจัดหน้าร้านครบ จึงเก็บแยกและห้าม Sync ทับ"
          items={[
            "ชื่อที่แสดงบนเว็บ, Slug และหมวดหมู่หน้าร้าน",
            "รูปหลายรูป วิดีโอ และลำดับ Gallery",
            "คำโปรย รายละเอียดแบบ Rich content และจุดเด่น",
            "ตารางไซซ์ คู่มือการเลือกสินค้า และป้ายโปรโมชัน",
            "SEO, สินค้าแนะนำ, Bundle, รีวิว และสถานะเผยแพร่",
          ]}
        />
      </section>

      <section className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
        <div className="flex flex-col gap-2 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">สถานะ Mapping สินค้า</h2>
            <p className="mt-1 text-xs text-zinc-500">ใช้ ZORT Product ID และ SKU เป็นกุญแจเชื่อมกับข้อมูลหน้าร้าน PonPon</p>
          </div>
          <span className="text-xs font-bold text-zinc-400">ซิงก์ล่าสุด 13 มิ.ย. 2569 09:42</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#fff8f6] text-xs text-zinc-500">
              <tr>
                <th className="px-5 py-3">สินค้า</th>
                <th className="px-5 py-3">ZORT Product ID</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">ซิงก์ล่าสุด</th>
                <th className="px-5 py-3">สถานะ</th>
                <th className="px-5 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {adminProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4 font-black">{product.name}</td>
                  <td className="px-5 py-4 text-zinc-500">{product.zortProductId}</td>
                  <td className="px-5 py-4 font-bold">{product.zortSku}</td>
                  <td className="px-5 py-4 text-zinc-500">{product.lastSyncedAt}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle[product.syncStatus]}`}>
                      {statusLabel[product.syncStatus]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/products/${product.id}/edit`} className="text-xs font-black text-red-600">
                      ตรวจรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        <p className="font-black">ก่อนต่อ API จริง</p>
        <p className="mt-1">
          ต้องนำ payload ตัวอย่างของสินค้า, ตัวเลือกสินค้า, สต็อก และออเดอร์จากบัญชี ZORT จริงมาเทียบก่อน
          เพื่อกำหนดชื่อ field และทิศทางการ Sync โดยไม่เดา schema ของ API
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "red";
}) {
  const colors = {
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };

  return (
    <article className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
      <p className="text-xs font-black text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${colors[tone]}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </article>
  );
}

function OwnershipCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl bg-[#fff8f6] px-4 py-3 text-sm font-bold">
            <span className="text-red-600">✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
