"use client";

import { useState } from "react";
import { History } from "lucide-react";
import type { Promotion } from "@/lib/admin-promotions";
import { Button } from "@/components/ui/button";
import { PromotionUsageDialog } from "@/components/promotion-usage-dialog";

export function PromotionUsageDialogLauncher({
  promotion,
}: {
  promotion: Pick<Promotion, "id" | "name">;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <History />
        ดูประวัติการใช้
      </Button>
      <PromotionUsageDialog
        open={open}
        onOpenChange={setOpen}
        promotionId={promotion.id}
        promotionName={promotion.name}
      />
    </>
  );
}
