import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-border p-4">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="hidden h-11 w-40 sm:block" />
          <Skeleton className="hidden h-11 w-40 sm:block" />
        </div>
      </div>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-border p-5">
          <div className="flex gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-full max-w-sm" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="size-20" />
                <Skeleton className="size-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
