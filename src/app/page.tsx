import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { adminCoupons, adminOrders, adminProducts } from "@/lib/admin-data";

const stats = [
  { label: "ยอดขายวันนี้", value: "฿18,420", change: "+12.4%", tone: "from-red-500 to-rose-700" },
  { label: "ออเดอร์ใหม่", value: "36", change: "8 รอตรวจสลิป", tone: "from-orange-400 to-red-500" },
  { label: "สินค้าพร้อมขาย", value: "128", change: "5 ใกล้หมด", tone: "from-zinc-800 to-zinc-950" },
  { label: "คูปองใช้งาน", value: "9", change: "3 แคมเปญ", tone: "from-pink-500 to-red-600" },
];

export default function DashboardPage() {
  const lowStock = adminProducts.filter((product) => product.stock <= 18);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Console"
        title="ภาพรวมร้าน PonPon"
        description="ดูยอดขาย ออเดอร์ สต็อก และโปรโมชันสำคัญจากหน้าจอเดียว"
        action={
          <Link href="/products" className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20">
            เพิ่มสินค้า
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
            <div className={`h-2 bg-gradient-to-r ${stat.tone}`} />
            <div className="p-5">
              <p className="text-sm font-bold text-zinc-500">{stat.label}</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{stat.change}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">ออเดอร์ล่าสุด</h2>
              <p className="mt-1 text-sm text-zinc-500">รายการที่ต้องติดตามจากหน้าร้าน</p>
            </div>
            <Link href="/orders" className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-600">ดูทั้งหมด</Link>
          </div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-100">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#fff8f6] text-xs uppercase tracking-wide text-zinc-500">
                <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {adminOrders.slice(0, 4).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4 font-black text-red-600">{order.id}</td>
                    <td className="px-4 py-4 font-bold">{order.customer}</td>
                    <td className="px-4 py-4 font-black">฿{order.total.toLocaleString()}</td>
                    <td className="px-4 py-4"><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{order.status}</span></td>
                    <td className="px-4 py-4 text-zinc-500">{order.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl bg-red-600 p-5 text-white shadow-[0_18px_45px_rgba(190,9,14,0.2)]">
          <p className="text-sm font-bold text-white/75">งานที่ควรทำก่อน</p>
          <h2 className="mt-2 text-2xl font-black">8 สลิปรอตรวจ</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">ตรวจหลักฐานการชำระเงินเพื่อให้ออเดอร์เดินต่อและลูกค้าเห็นสถานะเร็วที่สุด</p>
          <Link href="/orders" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-red-600">ไปตรวจสลิป</Link>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">สินค้าที่ต้องดูแล</h2><Link href="/products" className="text-xs font-black text-red-600">จัดการสินค้า</Link></div>
          <div className="mt-4 space-y-3">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#fff8f6] px-4 py-3">
                <div><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-zinc-500">คงเหลือ {item.stock} ชิ้น</p></div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-red-600 shadow-sm">{item.stock === 0 ? "หมด" : "ใกล้หมด"}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">โปรโมชันและคูปอง</h2><Link href="/coupons" className="text-xs font-black text-red-600">จัดการคูปอง</Link></div>
          <div className="mt-4 space-y-3">
            {adminCoupons.slice(0, 3).map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 px-4 py-3">
                <div><p className="font-bold">{coupon.name}</p><p className="mt-1 text-xs text-zinc-500">{coupon.condition}</p></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">{coupon.active ? "เปิดอยู่" : "ปิด"}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
