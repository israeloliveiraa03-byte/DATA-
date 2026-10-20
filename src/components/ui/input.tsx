import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; iconLeft?: string;
}

/** Classes de campo de formulário — reutilizar em <select>/<textarea> soltos. */
export const fieldClasses =
  "w-full rounded-md border border-ink-700 bg-ink-900 px-3 h-9 text-sm text-ink-100 placeholder:text-ink-500 shadow-xs " +
  "hover:border-ink-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:bg-ink-800 disabled:cursor-not-allowed transition-[border-color,box-shadow] duration-150 ease-out";

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, iconLeft, className, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-100">
          {label}{props.required && <span className="text-coral-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {iconLeft && <i className={cn("ti", iconLeft, "absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-base pointer-events-none")} aria-hidden="true" />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(fieldClasses, error && "border-coral-500 focus:border-coral-500 focus:ring-coral-500/20", iconLeft && "pl-9", className)}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-coral-500 flex items-center gap-1"><i className="ti ti-alert-circle" aria-hidden="true" />{error}</p>}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
});
Input.displayName = "Input";
