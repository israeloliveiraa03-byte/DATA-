import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, hoverable, ...props }: HTMLAttributes<HTMLDivElement> & { hoverable?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-ink-700 bg-ink-900",
        hoverable && "transition-colors duration-150 ease-out hover:border-brand-500/40",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-pad border-b border-ink-700", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-bold text-ink-100 font-condensed", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-ink-300 mt-0.5", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card-pad", className)} {...props} />;
}
