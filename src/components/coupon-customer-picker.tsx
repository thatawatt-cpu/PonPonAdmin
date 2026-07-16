"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, Search, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cachedSessionJsonRequest } from "@/lib/client-request-cache";
import { cn } from "@/lib/utils";

type Customer = {
  customerId: string;
  displayName?: string | null;
  lineUserId?: string | null;
  pictureUrl?: string | null;
  email?: string | null;
  status?: string | null;
};

type CustomerPage = {
  items?: Customer[];
};

const CUSTOMER_CACHE_MS = 2 * 60 * 1000;

export function CouponCustomerPicker({
  value,
  onValueChange,
  className,
}: {
  value: string;
  onValueChange: (customerId: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "20",
          sortBy: "createdAtUtc",
          sortDirection: "desc",
        });
        if (query.trim()) params.set("search", query.trim());
        const body = await cachedSessionJsonRequest<CustomerPage>(
          "coupon-customers",
          `/api/backend/admin/customers?${params}`,
          CUSTOMER_CACHE_MS,
          "โหลดรายชื่อลูกค้าไม่สำเร็จ",
        );
        if (cancelled) return;
        const items = body.items ?? [];
        setCustomers(items);
        const selected = items.find((customer) => customer.customerId === value);
        if (selected && !selectedLabel) setSelectedLabel(customerLabel(selected));
      } catch (requestError) {
        if (cancelled) return;
        setCustomers([]);
        setError(requestError instanceof Error ? requestError.message : "โหลดรายชื่อลูกค้าไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query, selectedLabel, value]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setError("");
    }
  }

  function selectCustomer(customer: Customer) {
    onValueChange(customer.customerId);
    setSelectedLabel(customerLabel(customer));
    handleOpenChange(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn("h-11 w-full min-w-0 justify-between px-3 font-normal", !value && "text-muted-foreground", className)}
        onClick={() => setOpen(true)}
      >
        <span className="min-w-0 truncate">{selectedLabel || (value ? "เลือกลูกค้าแล้ว" : "เลือกลูกค้า")}</span>
        <UserRoundSearch className="size-4 text-muted-foreground" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[82vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5 pr-14">
            <DialogTitle>เลือกลูกค้า</DialogTitle>
            <DialogDescription>ค้นหาด้วยชื่อลูกค้า, LINE User ID หรืออีเมล</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 px-5 pb-5">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาลูกค้า" className="h-11 pl-9" autoFocus />
            </div>

            {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />กำลังโหลดลูกค้า</div> : null}
            {!loading && error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">{error}</p> : null}
            {!loading && !error && customers.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">ไม่พบลูกค้าที่ค้นหา</p> : null}
            {!loading && !error && customers.length > 0 ? (
              <div className="max-h-[54vh] divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {customers.map((customer) => (
                  <button
                    type="button"
                    key={customer.customerId}
                    onClick={() => selectCustomer(customer)}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CustomerAvatar customer={customer} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{customer.displayName || "ลูกค้าไม่มีชื่อ"}</span>
                      <span className="block truncate text-xs text-muted-foreground">{customer.email || customer.lineUserId || "ไม่มีข้อมูลติดต่อ"}</span>
                    </span>
                    {value === customer.customerId ? <Check className="size-4 text-primary" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CustomerAvatar({ customer }: { customer: Customer }) {
  if (customer.pictureUrl) {
    return (
      <span
        aria-hidden="true"
        className="size-11 shrink-0 rounded-full border border-border bg-cover bg-center"
        style={{ backgroundImage: `url(${JSON.stringify(customer.pictureUrl)})` }}
      />
    );
  }

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
      {(customer.displayName || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function customerLabel(customer: Customer) {
  return customer.displayName || customer.email || "ลูกค้าไม่มีชื่อ";
}
