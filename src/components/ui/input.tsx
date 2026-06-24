import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; iconLeft?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, iconLeft, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}{props.required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <div className="relative">
        {iconLeft && <i className={cn("ti", iconLeft, "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none")} aria-hidden="true" />}
        <input ref={ref} id={inputId} className={cn("w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 disabled:bg-gray-50 disabled:cursor-not-allowed transition-shadow", error ? "border-red-300 focus:ring-red-400" : "border-gray-200 hover:border-gray-300", iconLeft && "pl-9", className)} {...props} />
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><i className="ti ti-alert-circle" />{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
});
Input.displayName = "Input";
