import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";
import { ThinkingDots } from "@/components/ui/thinking-dots";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary"|"secondary"|"ghost"|"danger";
  size?:    "sm"|"md"|"lg";
  loading?: boolean;
}

const variants = {
  primary:   "bg-brand-500 text-on-accent border border-brand-500 hover:bg-brand-600 hover:border-brand-600 focus-visible:ring-brand-400",
  secondary: "bg-ink-900 text-ink-100 border border-ink-700 hover:bg-ink-800 hover:border-ink-500 focus-visible:ring-ink-500",
  ghost:     "text-ink-300 border border-transparent hover:text-ink-100 hover:bg-ink-900 focus-visible:ring-ink-500",
  danger:    "bg-coral-500 text-on-accent border border-coral-500 hover:bg-coral-600 hover:border-coral-600 focus-visible:ring-coral-500",
};

const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-5 py-2.5 text-base gap-2" };

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading} className={cn("inline-flex items-center justify-center font-semibold rounded transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-ink-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]", variants[variant], sizes[size], className)} {...props}>
      {loading && <ThinkingDots />}
      {children}
    </button>
  );
}
