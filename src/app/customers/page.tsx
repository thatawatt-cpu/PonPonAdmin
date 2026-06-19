import { PageHeader } from "@/components/page-header";
import { adminCustomers } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ข้อมูลลูกค้า"
        title="ลูกค้า"
        description="ดูประวัติการซื้อ ยอดสะสม และข้อมูลสมาชิก LINE LIFF ของร้าน"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["ลูกค้าทั้งหมด", "1,248"],
          ["ลูกค้าซื้อซ้ำ", "38%"],
          ["ยอดเฉลี่ยต่อคน", "฿642"],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="pt-4 pb-0">
          <Input placeholder="ค้นหาชื่อลูกค้า หรือ LINE User ID" />
        </CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-4">ลูกค้า</th>
                <th className="px-5 py-4">LINE ID</th>
                <th className="px-5 py-4">ออเดอร์</th>
                <th className="px-5 py-4">ยอดใช้จ่าย</th>
                <th className="px-5 py-4">ออเดอร์ล่าสุด</th>
                <th className="px-5 py-4">ระดับ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {adminCustomers.map((customer) => (
                <tr key={customer.lineId} className="hover:bg-muted/30">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-muted font-semibold text-foreground">
                        {customer.name.charAt(0)}
                      </span>
                      <span className="font-semibold">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{customer.lineId}</td>
                  <td className="px-5 py-4 font-semibold">{customer.orders}</td>
                  <td className="px-5 py-4 font-semibold">
                    ฿{customer.spent.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{customer.lastOrder}</td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary">{customer.tier}</Badge>
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
