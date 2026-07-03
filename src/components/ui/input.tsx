import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; iconLeft?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, iconLeft, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-ink-100">{label}{props.required && <span className="text-coral-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        {iconLeft && <i className={cn("ti", iconLeft, "absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-base pointer-events-none")} aria-hidden="true" />}
        <input ref={ref} id={inputId} className={cn("w-full rounded-md border bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 focus:ring-offset-ink-950 disabled:bg-ink-950 disabled:cursor-not-allowed transition-colors duration-150 ease-out", error ? "border-coral-500 focus:ring-coral-500" : "border-ink-700 hover:border-ink-500", iconLeft && "pl-9", className)} {...props} />
      </div>
      {error && <p className="text-xs text-coral-500 flex items-center gap-1"><i className="ti ti-alert-circle" />{error}</p>}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
});
Input.displayName = "Input";
