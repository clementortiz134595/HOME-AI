import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-medium text-emerald-300", className)} {...props} />;
}

export { Badge };
