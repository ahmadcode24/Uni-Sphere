import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "surface" | "featured" | "paper";
  colorBlock?: "emerald" | "marigold" | "ink";
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "surface",
  colorBlock = "emerald",
  className = "",
  children,
  ...props
}) => {
  const base = "border-2 border-ink rounded-[18px] transition-all duration-150";

  let variantStyle = "";
  if (variant === "surface") {
    variantStyle = "bg-surface text-ink shadow-hard";
  } else if (variant === "paper") {
    variantStyle = "bg-paper text-ink shadow-hard-sm";
  } else if (variant === "featured") {
    const blockColors = {
      emerald: "bg-emerald text-white shadow-hard-lg",
      marigold: "bg-marigold text-ink shadow-hard-lg",
      ink: "bg-ink text-paper shadow-hard-lg",
    };
    variantStyle = blockColors[colorBlock];
  }

  return (
    <div className={`${base} ${variantStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};

