import { PageHeader } from "@/components/page-header";
import { adminOrders } from "@/lib/admin-data";

const filters = ["ทั้งหมด", "รอตรวจสลิป", "กำลังแพ็ก", "จัดส่งแล้ว", "สำเร็จ", "ยกเลิก"];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order Management" title="จัดการออเดอร์" description="ตรวจสลิป อัปเดตสถานะการแพ็ก และติดตามการจัดส่งของลูกค้า" />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter, index) => <button key={filter} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${index === 0 ? "bg-red-600 text-white" : "bg-white text-zinc-600 ring-1 ring-red-100"}`}>{filter}</button>)}
      </div>
      <section className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_45px_rgba(65,25,25,0.08)] ring-1 ring-red-100/70">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row">
          <input placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือเบอร์โทร" className="h-11 flex-1 rounded-2xl bg-[#fff8f6] px-4 text-sm outline-none ring-red-200 focus:ring-2" />
          <button className="h-11 rounded-2xl bg-red-600 px-5 text-sm font-black text-white">ค้นหา</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#fff8f6] text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Items</th><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead>
            <tbody className="divide-y divide-zinc-100">
              {adminOrders.map((order) => (
                <tr key={order.id} className="hover:bg-red-50/35">
                  <td className="px-5 py-4"><p className="font-black text-red-600">{order.id}</p><p className="mt-1 text-xs text-zinc-400">{order.createdAt}</p></td>
                  <td className="px-5 py-4"><p className="font-bold">{order.customer}</p><p className="mt-1 text-xs text-zinc-500">{order.phone}</p></td>
                  <td className="px-5 py-4">{order.items} ชิ้น</td><td className="px-5 py-4">{order.payment}</td><td className="px-5 py-4 font-black">฿{order.total.toLocaleString()}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600">{order.status}</span></td>
                  <td className="px-5 py-4"><button className="rounded-full border border-red-200 px-3 py-2 text-xs font-black text-red-600">ดูรายละเอียด</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
