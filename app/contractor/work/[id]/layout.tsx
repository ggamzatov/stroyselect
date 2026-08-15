import Link from "next/link";
import { Banknote, FolderOpen } from "lucide-react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ContractorWorkLayout({
  children,
  params,
}: Props) {
  const { id } = await params;

  return (
    <>
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="app-container flex flex-wrap gap-2 py-3">
          <Link
            href={`/contractor/work/${id}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-secondary/50"
          >
            <FolderOpen className="h-4 w-4 text-primary" />
            Рабочее пространство
          </Link>

          <Link
            href={`/contractor/work/${id}/changes`}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Banknote className="h-4 w-4" />
            Бюджет и изменения
          </Link>
        </div>
      </div>

      {children}
    </>
  );
}
