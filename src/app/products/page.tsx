import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { adminProducts, type SyncStatus } from "@/lib/admin-data";

const syncLabel: Record<SyncStatus, string> = {
  synced: "ZORT ซิงก์แล้ว",
  pending: "รอจับคู่ SKU",
  error: "Sync มีปัญหา",
};

const syncStyle: Record<SyncStatus, string> = {
  synced: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Catalog" title="จัดการสินค้า" description="แก้ไขข้อมูลสินค้า ราคา รูปภาพ ตัวเลือก และสต็อกที่แสดงในหน้าร้าน" action={<button className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20">+ เพิ่มสินค้า</button>} />
      <section className="rounded-3xl bg-white p-4 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input placeholder="ค้นหาชื่อสินค้า หรือ SKU" className="h-11 flex-1 rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none ring-red-200 focus:ring-2" />
          <select className="h-11 rounded-2xl bg-[#fff8f6] px-4 text-sm font-bold outline-none"><option>ทุกหมวดหมู่</option><option>ขนม</option><option>เครื่องดื่ม</option><option>แฟชั่น</option></select>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {adminProducts.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
            <div className="relative aspect-[1.6/1] bg-[#fff8f6]">
              <Image src={product.image} alt={product.name} fill className="object-contain p-3" sizes="(max-width: 640px) 100vw, 33vw" />
              <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-black ${product.stock === 0 ? "bg-red-600 text-white" : product.stock <= 18 ? "bg-amber-100 text-amber-700" : "bg-white text-emerald-600"}`}>{product.stock === 0 ? "สินค้าหมด" : `คงเหลือ ${product.stock}`}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-red-600">{product.category}</p>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${syncStyle[product.syncStatus]}`}>
                  {syncLabel[product.syncStatus]}
                </span>
              </div>
              <h2 className="mt-1 font-black">{product.name}</h2>
              <p className="mt-1 text-[11px] text-zinc-400">{product.zortSku} · {product.lastSyncedAt}</p>
              <div className="mt-4 flex items-end justify-between"><div><p className="text-xl font-black text-red-600">฿{product.price}</p><p className="text-xs text-zinc-500">ขายแล้ว {product.sold.toLocaleString()} ชิ้น</p></div><Link href={`/products/${product.id}/edit`} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white">แก้ไข</Link></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
