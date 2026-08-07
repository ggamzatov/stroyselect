import {
  FileText,
  Images,
  Paperclip,
} from "lucide-react";

type Props = {
  totalCount: number;
  photoCount: number;
  documentCount: number;
};

export function MaterialSummary({
  totalCount,
  photoCount,
  documentCount,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryItem
        label="Всего материалов"
        value={totalCount}
        icon={
          <Paperclip className="h-4 w-4" />
        }
      />

      <SummaryItem
        label="Фотографии"
        value={photoCount}
        icon={
          <Images className="h-4 w-4" />
        }
      />

      <SummaryItem
        label="Документы"
        value={documentCount}
        icon={
          <FileText className="h-4 w-4" />
        }
      />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}

        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}