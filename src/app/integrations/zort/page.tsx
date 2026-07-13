import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ZortSyncButton } from "@/components/zort-sync-button";
import { getAdminProducts, type AdminProduct, type SyncStatus } from "@/lib/admin-products";

const statusStyle: Record<SyncStatus, string> = {
  synced: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-300/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-300/20",
  error: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-300/20",
};

const statusLabel: Record<SyncStatus, string> = {
  synced: "ซิงก์แล้ว",
  pending: "รอซิงก์",
  error: "ต้องตรวจสอบ",
};

export default async function ZortIntegrationPage() {
  const { authRequired, error, products, source } = await getAdminProducts();

  if (authRequired) {
    redirect("/login");
  }

  const synced = products.filter((product) => product.syncStatus === "synced").length;
  const visibleOnLiff = products.filter((product) => product.isVisibleOnLiff).length;
  const errors = products.filter((product) => product.syncStatus === "error").length;
  const stockTotal = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <div className="min-h-full bg-background text-foreground">
      <section className="flex min-h-[calc(100vh-4.25rem)] flex-col">
        <div className="grid gap-6 border-b border-border p-5 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-start">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              การเชื่อมต่อ
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                ZORT POS Sync
              </h1>
              <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-black text-muted-foreground ring-1 ring-border">
                {source === "api" ? "API ออนไลน์" : "ข้อมูลสำรอง"}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Sync ทั้งหมดจาก ZORT อยู่ในหน้านี้: Product ID, SKU, รูปสินค้า,
              ราคา, สต็อก และสถานะที่ใช้ตรวจสอบก่อนนำไปแสดงบน LIFF
            </p>
          </div>
          <ZortSyncButton />
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          <Metric label="สินค้าจาก ZORT" value={`${products.length}`} detail="รายการทั้งหมดใน PonPon API" tone="neutral" />
          <Metric label="ซิงก์สำเร็จ" value={`${synced}`} detail="พร้อมใช้งานล่าสุด" tone="green" />
          <Metric label="แสดงบน LIFF" value={`${visibleOnLiff}`} detail="เปิดให้ลูกค้าเห็น" tone="green" />
          <Metric label="สต็อกรวม" value={`${stockTotal}`} detail={errors ? `${errors} รายการต้องตรวจสอบ` : "ไม่พบปัญหา sync"} tone={errors ? "red" : "amber"} />
        </div>

        <div className="flex-1 border-t border-border p-5 sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="border-b border-border bg-muted/40 p-4">
              <h3 className="text-sm font-black">ขอบเขตข้อมูล</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <SyncRule
                  label="ZORT เป็นเจ้าของ"
                  detail="SKU, ราคา, สต็อก, barcode และข้อมูลต้นทาง"
                />
                <SyncRule
                  label="PonPon เป็นเจ้าของ"
                  detail="รูปเสริม, คำโปรย, SEO, badge และการจัดหน้าร้าน"
                />
                <SyncRule
                  label="หน้าแก้สินค้า"
                  detail="ไม่มีปุ่ม sync หรือกล่อง source of truth แล้ว"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black">รายการที่ซิงก์จาก ZORT</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  ใช้ ZORT Product ID และ SKU เป็นข้อมูลอ้างอิงหลัก
                </p>
              </div>
              <span className="w-fit rounded-full bg-muted px-3 py-1.5 text-xs font-black text-muted-foreground">
                {products.length} รายการ
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">สินค้า</th>
                    <th className="px-4 py-3">ZORT Product ID</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">ราคา</th>
                    <th className="px-4 py-3">สต็อก</th>
                    <th className="px-4 py-3">LIFF</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((product) => (
                    <ProductRow key={product.id} product={product} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {source === "mock" ? (
        <section className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 sm:m-6">
          ใช้ข้อมูล mock อยู่ เพราะเรียก PonPon API ไม่สำเร็จ
          {error ? ` (${error})` : ""}
        </section>
      ) : null}
    </div>
  );
}

function ProductRow({ product }: { product: AdminProduct }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="48px"
              className="object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-black">{product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{product.zortProductId}</td>
      <td className="px-4 py-4 font-bold">{product.zortSku}</td>
      <td className="px-4 py-4 font-black">฿{product.price.toLocaleString()}</td>
      <td className="px-4 py-4 text-muted-foreground">{product.stock}</td>
      <td className="px-4 py-4">
        <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-black ${
          product.isVisibleOnLiff
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
            : "bg-muted text-muted-foreground"
        }`}>
          {product.isVisibleOnLiff ? "แสดง" : "ซ่อน"}
        </span>
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-black ring-1 ${statusStyle[product.syncStatus]}`}>
          {statusLabel[product.syncStatus]}
        </span>
      </td>
      <td className="px-4 py-4 text-right">
        <Link href={`/products/${product.parentProductId ?? product.id}/edit`} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          ตรวจรายละเอียด
        </Link>
      </td>
    </tr>
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
  tone: "green" | "amber" | "red" | "neutral";
}) {
  const colors = {
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-rose-600 dark:text-rose-400",
    neutral: "text-foreground",
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-black text-muted-foreground">{label}</p>
      <p className={`mt-2 text-3xl font-black ${colors[tone]}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function SyncRule({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-black">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
