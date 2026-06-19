import { PageHeader } from "@/components/page-header";
import { adminOrders } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const filters = ["ทั้งหมด", "รอตรวจสลิป", "กำลังแพ็ก", "จัดส่งแล้ว", "สำเร็จ", "ยกเลิก"];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="การจัดการ"
        title="จัดการออเดอร์"
        description="ตรวจสลิป อัปเดตสถานะการแพ็ก และติดตามการจัดส่งของลูกค้า"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter, index) => (
          <button
            key={filter}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${
              index === 0
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground ring-1 ring-border hover:bg-muted/50"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือเบอร์โทร"
              className="flex-1"
            />
            <Button>ค้นหา</Button>
          </div>
        </CardContent>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">ออเดอร์</th>
                <th className="px-5 py-4">ลูกค้า</th>
                <th className="px-5 py-4">รายการ</th>
                <th className="px-5 py-4">การชำระ</th>
                <th className="px-5 py-4">ยอดรวม</th>
                <th className="px-5 py-4">สถานะ</th>
                <th className="px-5 py-4">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adminOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{order.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.createdAt}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{order.customer}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.phone}</p>
                  </td>
                  <td className="px-5 py-4">{order.items} ชิ้น</td>
                  <td className="px-5 py-4">{order.payment}</td>
                  <td className="px-5 py-4 font-semibold">฿{order.total.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary">{order.status}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <button className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted">
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
