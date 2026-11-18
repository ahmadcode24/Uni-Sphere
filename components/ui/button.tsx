import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "marigold" | "rose" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "font-display font-bold border-2 border-ink inline-flex items-center justify-center gap-2 transition-all duration-100 rounded-[10px] select-none";

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-base",
      lg: "px-7 py-3.5 text-lg",
    };

    const variantClasses = {
      primary:
        "bg-emerald text-white shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      secondary:
        "bg-surface text-ink shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      marigold:
        "bg-marigold text-ink shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      rose:
        "bg-rose text-white shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none",
      ghost:
        "bg-transparent text-ink border-transparent hover:bg-mist/40 active:bg-mist/70",
    };

    const disabledClass = disabled
      ? "opacity-50 cursor-not-allowed transform-none hover:transform-none shadow-hard-sm pointer-events-none"
      : "";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${disabledClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
