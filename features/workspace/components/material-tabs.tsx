import {
  FileText,
  Images,
  LayoutGrid,
} from "lucide-react";

import type {
  MaterialTab,
} from
  "@/features/workspace/types/stage-file";

type Props = {
  activeTab: MaterialTab;
  totalCount: number;
  photoCount: number;
  documentCount: number;
  onChange: (
    tab: MaterialTab
  ) => void;
};

export function MaterialTabs({
  activeTab,
  totalCount,
  photoCount,
  documentCount,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <TabButton
        active={
          activeTab === "all"
        }
        onClick={() =>
          onChange("all")
        }
        icon={
          <LayoutGrid className="h-4 w-4" />
        }
      >
        Все ({totalCount})
      </TabButton>

      <TabButton
        active={
          activeTab ===
          "photos"
        }
        onClick={() =>
          onChange(
            "photos"
          )
        }
        icon={
          <Images className="h-4 w-4" />
        }
      >
        Фото ({photoCount})
      </TabButton>

      <TabButton
        active={
          activeTab ===
          "documents"
        }
        onClick={() =>
          onChange(
            "documents"
          )
        }
        icon={
          <FileText className="h-4 w-4" />
        }
      >
        Документы (
        {documentCount})
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(107,70,50,0.16)]"
          : "border border-border bg-card text-muted-foreground hover:border-primary/20 hover:bg-secondary/50 hover:text-foreground",
      ].join(" ")}
    >
      {icon}

      {children}
    </button>
  );
}