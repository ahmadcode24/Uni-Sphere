import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label htmlFor={inputId} className="font-semibold text-sm text-ink">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-surface text-ink border-2 rounded-[8px] border-ink shadow-hard-sm focus:outline-none focus:ring-0 focus:border-ink transition-colors placeholder:text-ink/40 text-base ${
            error ? "border-rose" : ""
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-semibold text-rose">{error}</span>}
        {!error && helper && <span className="text-xs text-ink/70">{helper}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

