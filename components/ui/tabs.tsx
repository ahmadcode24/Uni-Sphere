import React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = "" }) => {
  return (
    <div className={`flex flex-wrap gap-2 border-b-2 border-ink pb-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`font-display font-bold px-4 py-2 rounded-[10px] text-sm border-2 border-ink transition-all flex items-center gap-2 select-none ${
              isActive
                ? "bg-marigold text-ink shadow-hard translate-x-[-1px] translate-y-[-1px]"
                : "bg-surface text-ink hover:bg-mist/40 shadow-hard-sm"
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border border-ink ${
                  isActive ? "bg-ink text-paper" : "bg-mist text-ink"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

