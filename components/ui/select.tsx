import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, className = "", id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label htmlFor={selectId} className="font-semibold text-sm text-ink">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-surface text-ink border-2 rounded-[8px] border-ink shadow-hard-sm focus:outline-none focus:ring-0 transition-colors text-base appearance-none cursor-pointer ${
            error ? "border-rose" : ""
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs font-semibold text-rose">{error}</span>}
        {!error && helper && <span className="text-xs text-ink/70">{helper}</span>}
      </div>
    );
  }
);
Select.displayName = "Select";

