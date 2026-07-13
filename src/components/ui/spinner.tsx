import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <LoaderCircle
      data-slot="spinner"
      className={cn("size-4 animate-spin", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Spinner };
