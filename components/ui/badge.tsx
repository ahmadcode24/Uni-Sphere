import React from "react";

export type BadgeVariant =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "high"
  | "medium"
  | "low"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  children,
  className = "",
  dot = false,
}) => {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-tight border-2 border-ink select-none shadow-hard-sm";

  const variants: Record<BadgeVariant, string> = {
    draft: "bg-mist text-ink",
    pending: "bg-marigold text-ink",
    approved: "bg-emerald text-white",
    rejected: "bg-rose text-white",
    cancelled: "bg-paper text-ink line-through",
    upcoming: "bg-sky text-ink",
    ongoing: "bg-emerald text-white",
    completed: "bg-mist text-ink",
    high: "bg-rose text-white",
    medium: "bg-marigold text-ink",
    low: "bg-mist text-ink",
    default: "bg-paper text-ink",
  };

  const showPulsingDot = dot || variant === "ongoing";

  return (
    <span className={`${base} ${variants[variant] || variants.default} ${className}`}>
      {showPulsingDot && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
      )}
      {children}
    </span>
  );
};
