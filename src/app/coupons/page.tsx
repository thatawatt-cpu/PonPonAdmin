import { PageHeader } from "@/components/page-header";
import { adminCoupons } from "@/lib/admin-data";

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Promotion" title="คูปองและโปรโมชัน" description="สร้างโค้ดส่วนลด กำหนดเงื่อนไข จำนวนสิทธิ์ และวันหมดอายุ" action={<button className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20">+ สร้างคูปอง</button>} />
      <section className="grid gap-4 md:grid-cols-2">
        {adminCoupons.map((coupon) => {
          const percent = Math.round((coupon.used / coupon.limit) * 100);
          return (
            <article key={coupon.code} className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
              <div className="flex">
                <div className="grid w-28 shrink-0 place-items-center bg-red-600 p-4 text-center text-white"><div><p className="text-2xl font-black">{coupon.value}</p><p className="mt-1 text-[10px] font-bold text-white/75">{coupon.code}</p></div></div>
                <div className="min-w-0 flex-1 p-4"><div className="flex items-start justify-between gap-2"><div><h2 className="font-black">{coupon.name}</h2><p className="mt-1 text-xs text-zinc-500">{coupon.condition}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${coupon.active ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}>{coupon.active ? "เปิดใช้" : "ปิด"}</span></div>
                  <div className="mt-4"><div className="flex justify-between text-xs font-bold text-zinc-500"><span>ใช้แล้ว {coupon.used}</span><span>{coupon.limit} สิทธิ์</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-red-50"><div className="h-full rounded-full bg-red-600" style={{ width: `${percent}%` }} /></div></div>
                  <div className="mt-4 flex items-center justify-between"><p className="text-xs text-zinc-500">หมดอายุ {coupon.expires}</p><button className="rounded-full border border-red-200 px-3 py-2 text-xs font-black text-red-600">แก้ไข</button></div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
