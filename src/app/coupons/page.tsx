import { PageHeader } from "@/components/page-header";
import { adminCoupons } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CouponsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="โปรโมชัน"
        title="คูปองและโปรโมชัน"
        description="สร้างโค้ดส่วนลด กำหนดเงื่อนไข จำนวนสิทธิ์ และวันหมดอายุ"
        action={
          <button className={buttonVariants()}>+ สร้างคูปอง</button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        {adminCoupons.map((coupon) => {
          const percent = Math.round((coupon.used / coupon.limit) * 100);
          return (
            <Card key={coupon.code} className="overflow-hidden">
              <div className="flex">
                <div className="grid w-28 shrink-0 place-items-center bg-primary p-4 text-center text-primary-foreground">
                  <div>
                    <p className="text-2xl font-black">{coupon.value}</p>
                    <p className="mt-1 text-[10px] font-bold text-primary-foreground/75">
                      {coupon.code}
                    </p>
                  </div>
                </div>
                <CardContent className="min-w-0 flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{coupon.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {coupon.condition}
                      </p>
                    </div>
                    <Badge variant={coupon.active ? "default" : "secondary"}>
                      {coupon.active ? "เปิดใช้" : "ปิด"}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>ใช้แล้ว {coupon.used}</span>
                      <span>{coupon.limit} สิทธิ์</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      หมดอายุ {coupon.expires}
                    </p>
                    <button
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      แก้ไข
                    </button>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
