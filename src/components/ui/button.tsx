import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary"|"secondary"|"ghost"|"danger";
  size?:    "sm"|"md"|"lg";
  loading?: boolean;
}

const variants = {
  primary:   "bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus-visible:ring-gray-300",
  ghost:     "text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-300",
  danger:    "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500",
};

const sizes = { sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-5 py-2.5 text-base gap-2" };

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading} className={cn("inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)} {...props}>
      {loading && <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
