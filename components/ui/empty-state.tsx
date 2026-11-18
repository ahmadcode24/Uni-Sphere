import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border-2 border-dashed border-ink rounded-[18px] max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-mist/60 border-2 border-ink flex items-center justify-center text-ink mb-3 shadow-hard-sm">
        {icon || <FolderOpen className="w-6 h-6 stroke-[2]" />}
      </div>
      <h3 className="font-display font-bold text-lg text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink/75 max-w-xs mb-4">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

