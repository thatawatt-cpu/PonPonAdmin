import { PageHeader } from "@/components/page-header";
import { adminCustomers } from "@/lib/admin-data";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="CRM" title="ลูกค้า" description="ดูประวัติการซื้อ ยอดสะสม และข้อมูลสมาชิก LINE LIFF ของร้าน" />
      <section className="grid gap-4 sm:grid-cols-3">
        {[["ลูกค้าทั้งหมด", "1,248"], ["ลูกค้าซื้อซ้ำ", "38%"], ["ยอดเฉลี่ยต่อคน", "฿642"]].map(([label, value]) => <article key={label} className="rounded-3xl bg-white p-5 shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70"><p className="text-sm font-bold text-zinc-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></article>)}
      </section>
      <section className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
        <div className="border-b border-zinc-100 p-4"><input placeholder="ค้นหาชื่อลูกค้า หรือ LINE User ID" className="h-11 w-full rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none ring-red-200 focus:ring-2" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-[#fff8f6] text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">LINE ID</th><th className="px-5 py-4">Orders</th><th className="px-5 py-4">Total spent</th><th className="px-5 py-4">Last order</th><th className="px-5 py-4">Tier</th></tr></thead>
          <tbody className="divide-y divide-zinc-100">{adminCustomers.map((customer) => <tr key={customer.lineId}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 font-black text-red-600">{customer.name.charAt(0)}</span><span className="font-black">{customer.name}</span></div></td><td className="px-5 py-4 text-zinc-500">{customer.lineId}</td><td className="px-5 py-4 font-bold">{customer.orders}</td><td className="px-5 py-4 font-black">฿{customer.spent.toLocaleString()}</td><td className="px-5 py-4 text-zinc-500">{customer.lastOrder}</td><td className="px-5 py-4"><span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{customer.tier}</span></td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
