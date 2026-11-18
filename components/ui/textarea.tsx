import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className = "", id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full text-left">
        {label && (
          <label htmlFor={textareaId} className="font-semibold text-sm text-ink">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-surface text-ink border-2 rounded-[8px] border-ink shadow-hard-sm focus:outline-none focus:ring-0 transition-colors placeholder:text-ink/40 text-base min-h-[100px] resize-y ${
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
Textarea.displayName = "Textarea";

