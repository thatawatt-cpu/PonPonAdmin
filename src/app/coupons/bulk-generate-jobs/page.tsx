import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { CouponBulkJobHistory } from "@/components/coupon-bulk-job-history";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getAdminCouponBulkGenerateJobs } from "@/lib/admin-coupons";

export default async function CouponBulkGenerateJobsPage() {
  const result = await getAdminCouponBulkGenerateJobs(50);
  if (result.authRequired) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coupons"
        title="ประวัติการสร้างคูปอง"
        description="ติดตามงาน Bulk Generate และดาวน์โหลดรหัสคูปองเมื่องานสำเร็จ"
        action={
          <Link href="/coupons" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft />
            กลับหน้าคูปอง
          </Link>
        }
      />

      {result.error ? (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="bulk-job-history-heading">
        <h2 id="bulk-job-history-heading" className="sr-only">
          <History />
          รายการงานสร้างคูปอง
        </h2>
        <CouponBulkJobHistory initialJobs={result.jobs} />
      </section>
    </div>
  );
}
