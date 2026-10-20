import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";
import { ThinkingDots } from "@/components/ui/thinking-dots";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center font-semibold rounded-md whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 " +
  "disabled:opacity-50 disabled:pointer-events-none active:translate-y-px";

const variants: Record<ButtonVariant, string> = {
  primary:   "bg-brand-500 text-on-accent border border-brand-600 shadow-sm hover:bg-brand-600",
  secondary: "bg-ink-900 text-ink-100 border border-ink-700 shadow-xs hover:bg-ink-800 hover:border-ink-600",
  outline:   "bg-transparent text-brand-400 border border-brand-500/50 hover:bg-brand-500/10 hover:border-brand-500",
  ghost:     "text-ink-300 border border-transparent hover:text-ink-100 hover:bg-ink-800",
  danger:    "bg-coral-500 text-on-accent border border-coral-600 shadow-sm hover:bg-coral-600",
  link:      "text-brand-400 border border-transparent underline-offset-4 hover:underline px-0",
};

const sizes: Record<ButtonSize, string> = {
  xs:   "h-7 px-2.5 text-xs gap-1",
  sm:   "h-8 px-3 text-xs gap-1.5",
  md:   "h-9 px-4 text-sm gap-2",
  lg:   "h-11 px-5 text-base gap-2",
  icon: "h-9 w-9 text-base",
};

/** Classes de botão para usar em <Link> e <a> (mesma aparência do <Button>). */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading} className={buttonClasses(variant, size, className)} {...props}>
      {loading && <ThinkingDots />}
      {children}
    </button>
  );
}
