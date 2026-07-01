import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary"|"secondary"|"ghost"|"danger";
  size?:    "sm"|"md"|"lg";
  loading?: boolean;
}

const variants = {
  primary:   "bg-brand-600 text-white shadow-xs hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary: "bg-white text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-300",
  ghost:     "text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-300",
  danger:    "bg-coral-500 text-white shadow-xs hover:bg-coral-600 focus-visible:ring-coral-500",
};

const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-5 py-2.5 text-base gap-2" };

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading} className={cn("inline-flex items-center justify-center font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]", variants[variant], sizes[size], className)} {...props}>
      {loading && <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
