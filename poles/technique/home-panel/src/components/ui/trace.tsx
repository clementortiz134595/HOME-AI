import { cn } from "@/lib/utils";

export function Trace({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("trace", className)} {...props} />;
}

export function TraceCollapsible({ children, defaultOpen = false, className, ...props }: React.DetailsHTMLAttributes<HTMLDetailsElement> & { defaultOpen?: boolean }) {
  return <details open={defaultOpen} className={className} {...props}>{children}</details>;
}

export function TraceCollapsibleTrigger({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <summary className={cn("list-none", className)} {...props}>{children}</summary>;
}

export function TraceCollapsibleContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props}>{children}</div>;
}

export function TraceLine({ status = "pending", className, ...props }: React.HTMLAttributes<HTMLDivElement> & { status?: "running" | "pending" | "complete" }) {
  return <div data-status={status} className={cn("trace-line", className)} {...props} />;
}

export function TraceIcon({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("trace-icon", className)} {...props} />;
}

export function TraceTitle({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("trace-title", className)} {...props} />;
}

export function TraceDescription({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("trace-description", className)} {...props} />;
}
