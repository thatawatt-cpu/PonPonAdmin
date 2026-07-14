"use client";

import { FormEvent, ReactNode, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, RotateCcw, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

type CustomerListItem = {
  customerId: string;
  displayName: string | null;
  lineUserId: string | null;
  pictureUrl: string | null;
  email: string | null;
  status: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAtUtc: string | null;
  createdAtUtc: string | null;
  lastLoginAtUtc: string | null;
};

type CustomersResponse = {
  totalCustomers: number;
  repeatCustomerRate: number;
  averageOrderValue: number;
  newCustomersLast30Days: number;
  customersWithOrders: number;
  totalItems: number;
  items: CustomerListItem[];
};

type CustomerFilters = {
  status: "" | "Active" | "Inactive";
  hasOrders: "" | "true" | "false";
  createdFromUtc: string;
  createdToUtc: string;
  sortBy: "createdAtUtc" | "orderCount" | "totalSpent" | "lastLoginAtUtc";
  sortDirection: "asc" | "desc";
};

const DEFAULT_FILTERS: CustomerFilters = {
  status: "",
  hasOrders: "",
  createdFromUtc: "",
  createdToUtc: "",
  sortBy: "createdAtUtc",
  sortDirection: "desc",
};

const EMPTY_RESPONSE: CustomersResponse = {
  totalCustomers: 0,
  repeatCustomerRate: 0,
  averageOrderValue: 0,
  newCustomersLast30Days: 0,
  customersWithOrders: 0,
  totalItems: 0,
  items: [],
};

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersPageSkeleton />}>
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const initialPage = positiveInteger(searchParams.get("page"), 1);
  const initialFilters = readFilters(searchParams);
  const [data, setData] = useState<CustomersResponse>(EMPTY_RESPONSE);
  const [search, setSearch] = useState(initialSearch);
  const [inputValue, setInputValue] = useState(initialSearch);
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const rangeStart = data.items.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = (page - 1) * PAGE_SIZE + data.items.length;
  const hasNextPage = page * PAGE_SIZE < data.totalItems;
  const hasActiveCriteria = Boolean(
    search ||
      filters.status ||
      filters.hasOrders ||
      filters.createdFromUtc ||
      filters.createdToUtc,
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      const params = buildApiParams(search, page, filters);
      try {
        const response = await fetch(`/api/backend/admin/customers?${params}`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error("Cannot load customers");
        }

        const nextData = normalizeCustomersResponse(await response.json());
        if (active) {
          setData(nextData);
          setError(false);
        }
      } catch {
        if (active) {
          setData(EMPTY_RESPONSE);
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [filters, page, reloadKey, search]);

  function updateUrl(nextSearch: string, nextPage: number, nextFilters = filters) {
    const params = buildUrlParams(nextSearch, nextPage, nextFilters);
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = inputValue.trim();
    setLoading(true);
    setError(false);
    setSearch(nextSearch);
    setPage(1);
    updateUrl(nextSearch, 1, filters);
  }

  function resetCriteria() {
    setLoading(true);
    setError(false);
    setInputValue("");
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    updateUrl("", 1, DEFAULT_FILTERS);
  }

  function updateFilter<Key extends keyof CustomerFilters>(
    key: Key,
    value: CustomerFilters[Key],
  ) {
    const nextFilters = { ...filters, [key]: value };
    setLoading(true);
    setError(false);
    setFilters(nextFilters);
    setPage(1);
    updateUrl(search, 1, nextFilters);
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setError(false);
    setPage(nextPage);
    updateUrl(search, nextPage, filters);
  }

  function retry() {
    setLoading(true);
    setError(false);
    setReloadKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ข้อมูลลูกค้า"
        title="ลูกค้า"
        description="ดูประวัติการซื้อ ยอดสะสม และข้อมูลสมาชิก LINE LIFF ของร้าน"
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="ลูกค้าทั้งหมด"
          loading={loading}
          supportingLabel="สมาชิกที่อยู่ในระบบทั้งหมด"
          value={`${data.totalCustomers.toLocaleString("th-TH")} คน`}
        />
        <SummaryCard
          label="ลูกค้าใหม่ 30 วัน"
          loading={loading}
          supportingLabel="สมาชิกใหม่ในช่วง 30 วันที่ผ่านมา"
          value={`${data.newCustomersLast30Days.toLocaleString("th-TH")} คน`}
        />
        <SummaryCard
          label="ลูกค้าที่เคยสั่งซื้อ"
          loading={loading}
          supportingLabel="สมาชิกที่มีออเดอร์อย่างน้อย 1 รายการ"
          value={`${data.customersWithOrders.toLocaleString("th-TH")} คน`}
        />
      </section>

      <Card className="shadow-none">
        <CardContent className="py-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="ค้นหาลูกค้า"
                placeholder="ค้นหาชื่อลูกค้า LINE User ID หรืออีเมล"
                className="h-11 pl-10"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "กำลังค้นหา..." : "ค้นหา"}
            </Button>
          </form>
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-6">
            <FilterField label="สถานะ">
              <NativeSelect
                className="w-full"
                aria-label="กรองตามสถานะ"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value as CustomerFilters["status"])}
              >
                <NativeSelectOption value="">ทุกสถานะ</NativeSelectOption>
                <NativeSelectOption value="Active">ใช้งาน</NativeSelectOption>
                <NativeSelectOption value="Inactive">ปิดใช้งาน</NativeSelectOption>
              </NativeSelect>
            </FilterField>
            <FilterField label="การสั่งซื้อ">
              <NativeSelect
                className="w-full"
                aria-label="กรองตามการสั่งซื้อ"
                value={filters.hasOrders}
                onChange={(event) => updateFilter("hasOrders", event.target.value as CustomerFilters["hasOrders"])}
              >
                <NativeSelectOption value="">ทั้งหมด</NativeSelectOption>
                <NativeSelectOption value="true">เคยสั่งซื้อ</NativeSelectOption>
                <NativeSelectOption value="false">ยังไม่เคยสั่งซื้อ</NativeSelectOption>
              </NativeSelect>
            </FilterField>
            <FilterField label="สมัครตั้งแต่">
              <Input
                type="date"
                aria-label="กรองวันที่สมัครตั้งแต่"
                value={filters.createdFromUtc}
                max={filters.createdToUtc || undefined}
                onChange={(event) => updateFilter("createdFromUtc", event.target.value)}
              />
            </FilterField>
            <FilterField label="สมัครถึง">
              <Input
                type="date"
                aria-label="กรองวันที่สมัครถึง"
                value={filters.createdToUtc}
                min={filters.createdFromUtc || undefined}
                onChange={(event) => updateFilter("createdToUtc", event.target.value)}
              />
            </FilterField>
            <FilterField label="เรียงตาม">
              <NativeSelect
                className="w-full"
                aria-label="เรียงข้อมูลตาม"
                value={filters.sortBy}
                onChange={(event) => updateFilter("sortBy", event.target.value as CustomerFilters["sortBy"])}
              >
                <NativeSelectOption value="createdAtUtc">วันที่สมัคร</NativeSelectOption>
                <NativeSelectOption value="orderCount">จำนวนออเดอร์</NativeSelectOption>
                <NativeSelectOption value="totalSpent">ยอดใช้จ่าย</NativeSelectOption>
                <NativeSelectOption value="lastLoginAtUtc">เข้าสู่ระบบล่าสุด</NativeSelectOption>
              </NativeSelect>
            </FilterField>
            <FilterField label="ลำดับ">
              <NativeSelect
                className="w-full"
                aria-label="ลำดับการเรียงข้อมูล"
                value={filters.sortDirection}
                onChange={(event) => updateFilter("sortDirection", event.target.value as CustomerFilters["sortDirection"])}
              >
                <NativeSelectOption value="desc">มากไปน้อย / ล่าสุด</NativeSelectOption>
                <NativeSelectOption value="asc">น้อยไปมาก / เก่าสุด</NativeSelectOption>
              </NativeSelect>
            </FilterField>
          </div>
          {hasActiveCriteria ? (
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={resetCriteria}>
                <RotateCcw />
                ล้างการค้นหาและตัวกรอง
              </Button>
            </div>
          ) : null}
        </CardContent>

        {error ? (
          <CustomersError onRetry={retry} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="bg-muted/70 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">ลูกค้า</th>
                  <th scope="col" className="px-5 py-3">LINE User ID</th>
                  <th scope="col" className="px-5 py-3 text-right">ออเดอร์</th>
                  <th scope="col" className="px-5 py-3 text-right">ยอดใช้จ่าย</th>
                  <th scope="col" className="px-5 py-3">ออเดอร์ล่าสุด</th>
                  <th scope="col" className="px-5 py-3">สมัครเมื่อ</th>
                  <th scope="col" className="px-5 py-3">เข้าสู่ระบบล่าสุด</th>
                  <th scope="col" className="px-5 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }, (_, index) => (
                    <CustomerSkeletonRow key={index} />
                  ))
                ) : data.items.length ? (
                  data.items.map((customer) => (
                    <CustomerRow key={customer.customerId} customer={customer} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <CustomersEmpty hasActiveCriteria={hasActiveCriteria} onClear={resetCriteria} />
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            <CustomersMobileList
              customers={data.items}
              hasActiveCriteria={hasActiveCriteria}
              loading={loading}
              onClear={resetCriteria}
            />
          </>
        )}

        {!loading && !error && (data.items.length > 0 || page > 1) ? (
          <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              แสดง {rangeStart.toLocaleString("th-TH")}–{rangeEnd.toLocaleString("th-TH")} จาก {data.totalItems.toLocaleString("th-TH")} รายการ
            </p>
            <div className="flex gap-2">
              <span className="hidden min-h-11 items-center rounded-lg bg-muted px-3 text-sm text-muted-foreground sm:inline-flex">
                {PAGE_SIZE} รายการต่อหน้า
              </span>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none"
                disabled={!hasNextPage}
                onClick={() => changePage(page + 1)}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  loading,
  supportingLabel,
  value,
}: {
  label: string;
  loading: boolean;
  supportingLabel?: string;
  value: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-28" />
        ) : (
          <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
        )}
        {supportingLabel ? (
          <p className="mt-2 text-sm text-muted-foreground">{supportingLabel}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FilterField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CustomersMobileList({
  customers,
  hasActiveCriteria,
  loading,
  onClear,
}: {
  customers: CustomerListItem[];
  hasActiveCriteria: boolean;
  loading: boolean;
  onClear: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 md:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!customers.length) {
    return (
      <div className="md:hidden">
        <CustomersEmpty hasActiveCriteria={hasActiveCriteria} onClear={onClear} />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 md:hidden">
      {customers.map((customer) => (
        <article key={customer.customerId} className="rounded-xl bg-background p-4 ring-1 ring-border">
          <div className="flex items-start gap-3">
            <CustomerAvatar customer={customer} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {customer.displayName || "ลูกค้าไม่มีชื่อ"}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {customer.email || "ไม่มีอีเมล"}
              </p>
            </div>
            <Badge variant="secondary" className={customerStatusClass(customer.status)}>
              {customerStatusLabel(customer.status)}
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground">ออเดอร์</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {customer.orderCount.toLocaleString("th-TH")}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-right">
              <p className="text-xs font-medium text-muted-foreground">ยอดสั่งซื้อรวม</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(customer.totalSpent)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-sm">
            <span className="text-muted-foreground">ออเดอร์ล่าสุด</span>
            <span className="text-right font-medium">
              {customer.orderCount === 0
                ? "ยังไม่มีออเดอร์"
                : formatDate(customer.lastOrderAtUtc)}
            </span>
          </div>
          {customer.orderCount === 0 ? (
            <Badge variant="secondary" className="mt-3 bg-muted text-muted-foreground hover:bg-muted">
              ยังไม่เคยซื้อ
            </Badge>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerListItem }) {
  return (
    <tr className="h-20 transition-colors hover:bg-muted/30">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <CustomerAvatar customer={customer} />
          <div className="min-w-0">
            <p className="max-w-52 truncate font-semibold">{customer.displayName || "ลูกค้าไม่มีชื่อ"}</p>
            <p className="mt-1 max-w-52 truncate text-sm text-muted-foreground">
              {customer.email || "ไม่มีอีเมล"}
            </p>
          </div>
        </div>
      </td>
      <td className="max-w-56 px-5 py-3 font-mono text-xs text-muted-foreground">
        <p className="truncate" title={customer.lineUserId || undefined}>{customer.lineUserId || "—"}</p>
      </td>
      <td className="px-5 py-3 text-right font-semibold tabular-nums">
        {customer.orderCount.toLocaleString("th-TH")}
      </td>
      <td className="px-5 py-3 text-right font-semibold tabular-nums">
        {formatMoney(customer.totalSpent)}
      </td>
      <td className="px-5 py-3 text-muted-foreground">
        {customer.orderCount === 0 ? "ยังไม่มีออเดอร์" : formatDate(customer.lastOrderAtUtc)}
      </td>
      <td className="px-5 py-3 text-muted-foreground">{formatDate(customer.createdAtUtc)}</td>
      <td className="px-5 py-3 text-muted-foreground">{formatDate(customer.lastLoginAtUtc)}</td>
      <td className="px-5 py-3">
        <Badge variant="secondary" className={customerStatusClass(customer.status)}>
          {customerStatusLabel(customer.status)}
        </Badge>
      </td>
    </tr>
  );
}

function CustomerAvatar({ customer }: { customer: CustomerListItem }) {
  if (customer.pictureUrl) {
    return (
      // Customer avatars may come from LINE CDN or another backend-configured host.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customer.pictureUrl}
        alt=""
        className="size-11 shrink-0 rounded-full bg-muted object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted font-semibold">
      {(customer.displayName || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function CustomerSkeletonRow() {
  return (
    <tr className="h-20">
      <td className="px-5"><Skeleton className="h-11 w-44" /></td>
      <td className="px-5"><Skeleton className="h-4 w-40" /></td>
      <td className="px-5"><Skeleton className="ml-auto h-4 w-10" /></td>
      <td className="px-5"><Skeleton className="ml-auto h-4 w-20" /></td>
      <td className="px-5"><Skeleton className="h-4 w-28" /></td>
      <td className="px-5"><Skeleton className="h-4 w-28" /></td>
      <td className="px-5"><Skeleton className="h-4 w-28" /></td>
      <td className="px-5"><Skeleton className="h-7 w-20" /></td>
    </tr>
  );
}

function CustomersEmpty({
  hasActiveCriteria,
  onClear,
}: {
  hasActiveCriteria: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center">
      <Users className="size-8 text-muted-foreground" />
      <p className="mt-3 text-base font-semibold">
        {hasActiveCriteria ? "ไม่พบลูกค้าที่ตรงกับตัวกรอง" : "ยังไม่มีข้อมูลลูกค้า"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasActiveCriteria
          ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูรายการทั้งหมด"
          : "ลูกค้าจะแสดงหลังเข้าร่วมผ่าน LINE LIFF หรือสั่งซื้อสินค้า"}
      </p>
      {hasActiveCriteria ? (
        <Button variant="outline" size="lg" className="mt-4" onClick={onClear}>
          ล้างการค้นหาและตัวกรอง
        </Button>
      ) : null}
    </div>
  );
}

function CustomersError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center" role="alert">
      <AlertCircle className="size-8 text-destructive" />
      <p className="mt-3 text-base font-semibold">โหลดข้อมูลลูกค้าไม่สำเร็จ</p>
      <p className="mt-1 text-sm text-muted-foreground">กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p>
      <Button variant="outline" size="lg" className="mt-4" onClick={onRetry}>
        ลองใหม่
      </Button>
    </div>
  );
}

function CustomersPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function normalizeCustomersResponse(value: unknown): CustomersResponse {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const summary =
    data.summary && typeof data.summary === "object"
      ? (data.summary as Record<string, unknown>)
      : data;
  const items = Array.isArray(data.items) ? data.items : [];

  return {
    totalCustomers: numberValue(summary.totalCustomers),
    repeatCustomerRate: numberValue(summary.repeatCustomerRate),
    averageOrderValue: numberValue(summary.averageOrderValue),
    newCustomersLast30Days: numberValue(summary.newCustomersLast30Days),
    customersWithOrders: numberValue(summary.customersWithOrders),
    totalItems: numberValue(data.totalItems ?? data.total ?? summary.totalCustomers),
    items: items.map(normalizeCustomer),
  };
}

function normalizeCustomer(value: unknown): CustomerListItem {
  const customer = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    customerId: String(customer.customerId ?? ""),
    displayName: nullableString(customer.displayName),
    lineUserId: nullableString(customer.lineUserId),
    pictureUrl: nullableString(customer.pictureUrl),
    email: nullableString(customer.email),
    status: String(customer.status ?? ""),
    orderCount: numberValue(customer.orderCount),
    totalSpent: numberValue(customer.totalSpent),
    lastOrderAtUtc: nullableString(customer.lastOrderAtUtc),
    createdAtUtc: nullableString(customer.createdAtUtc),
    lastLoginAtUtc: nullableString(customer.lastLoginAtUtc),
  };
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) return "ยังไม่มีข้อมูล";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function customerStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Active: "ใช้งาน",
    Blocked: "ปิดใช้งาน",
    Inactive: "ปิดใช้งาน",
  };

  return labels[status] ?? (status || "ไม่ระบุ");
}

function customerStatusClass(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active") {
    return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (normalized === "blocked") {
    return "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground hover:bg-muted";
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readFilters(params: { get(name: string): string | null }): CustomerFilters {
  const status = params.get("status");
  const hasOrders = params.get("hasOrders");
  const sortBy = params.get("sortBy");
  const sortDirection = params.get("sortDirection");

  return {
    status: status === "Active" || status === "Inactive" ? status : "",
    hasOrders: hasOrders === "true" || hasOrders === "false" ? hasOrders : "",
    createdFromUtc: params.get("createdFromUtc") ?? "",
    createdToUtc: params.get("createdToUtc") ?? "",
    sortBy:
      sortBy === "orderCount" ||
      sortBy === "totalSpent" ||
      sortBy === "lastLoginAtUtc"
        ? sortBy
        : "createdAtUtc",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
  };
}

function buildUrlParams(search: string, page: number, filters: CustomerFilters) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (filters.status) params.set("status", filters.status);
  if (filters.hasOrders) params.set("hasOrders", filters.hasOrders);
  if (filters.createdFromUtc) params.set("createdFromUtc", filters.createdFromUtc);
  if (filters.createdToUtc) params.set("createdToUtc", filters.createdToUtc);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortDirection !== DEFAULT_FILTERS.sortDirection) {
    params.set("sortDirection", filters.sortDirection);
  }
  if (page > 1) params.set("page", String(page));
  return params;
}

function buildApiParams(search: string, page: number, filters: CustomerFilters) {
  const params = buildUrlParams(search, page, filters);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));
  params.set("sortBy", filters.sortBy);
  params.set("sortDirection", filters.sortDirection);
  if (filters.createdFromUtc) {
    params.set("createdFromUtc", `${filters.createdFromUtc}T00:00:00.000Z`);
  }
  if (filters.createdToUtc) {
    params.set("createdToUtc", `${filters.createdToUtc}T23:59:59.999Z`);
  }
  return params;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableString(value: unknown) {
  return value == null || value === "" ? null : String(value);
}
