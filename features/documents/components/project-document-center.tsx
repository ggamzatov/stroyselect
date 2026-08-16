import Link from "next/link";
import { FileText, Plus, Trash2 } from "lucide-react";

import { deleteProjectDocument, uploadProjectDocument } from "@/features/documents/actions/project-documents";

const CATEGORIES = [
  ["contract", "Договор"], ["estimate", "Смета"], ["act", "Акт"],
  ["invoice", "Счёт"], ["receipt", "Чек"], ["plan", "План"],
  ["photo", "Фото"], ["permit", "Разрешение"], ["warranty", "Гарантия"], ["other", "Другое"],
] as const;

type DocumentItem = {
  id: string;
  projectId: string;
  uploadedBy: string;
  category: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  version: number;
  parentDocumentId: string | null;
  createdAt: string;
  uploaderName: string;
  downloadUrl: string;
};

export function ProjectDocumentCenter({
  projectId,
  role,
  documents,
  backHref,
}: {
  projectId: string;
  role: "customer" | "contractor";
  documents: DocumentItem[];
  backHref: string;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link href={backHref} className="text-sm font-semibold text-muted-foreground hover:text-primary">← Вернуться к проекту</Link>

        <section className="mt-5 rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <p className="text-sm font-semibold text-primary">Документы проекта</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-foreground md:text-4xl">Единый центр файлов</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Договоры, сметы, акты, счета, планы и гарантии хранятся в приватном S3. Каждая новая версия остаётся отдельной записью с автором и временем загрузки.</p>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
          <h2 className="font-bold text-foreground">Добавить документ</h2>
          <form action={uploadProjectDocument} className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_1fr_auto]">
            <input type="hidden" name="projectId" value={projectId} />
            <input name="title" required minLength={2} maxLength={240} placeholder="Название документа" className="stroy-input" />
            <select name="category" defaultValue="other" className="stroy-input">{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx" className="stroy-input" />
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Загрузить</button>
          </form>
        </section>

        <div className="mt-6 space-y-3">
          {documents.map((document) => (
            <article key={document.id} className="flex flex-col gap-4 rounded-[1.4rem] border border-border bg-card p-4 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0"><p className="truncate font-bold text-foreground">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{categoryLabel(document.category)} · версия {document.version} · {formatSize(document.fileSize)} · {document.uploaderName} · {formatDate(document.createdAt)}</p><p className="mt-1 truncate text-xs text-muted-foreground/70">{document.fileName}</p></div>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={document.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground">Открыть</a>
                <form action={uploadProjectDocument}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="category" value={document.category} />
                  <input type="hidden" name="title" value={document.title} />
                  <input type="hidden" name="parentDocumentId" value={document.id} />
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background px-4 text-xs font-semibold text-foreground">Новая версия<input name="file" type="file" required className="sr-only" onChange={(event) => event.currentTarget.form?.requestSubmit()} /></label>
                </form>
                <form action={deleteProjectDocument}>
                  <input type="hidden" name="id" value={document.id} /><input type="hidden" name="projectId" value={projectId} />
                  <button title="Скрыть документ" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-red-600"><Trash2 className="h-4 w-4" /></button>
                </form>
              </div>
            </article>
          ))}
          {documents.length === 0 && <div className="rounded-[1.5rem] border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Документов пока нет.</div>}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Роль: {role === "customer" ? "заказчик" : "подрядчик"}. Ссылки на скачивание действуют ограниченное время.</p>
      </div>
    </main>
  );
}

function categoryLabel(value: string) { return CATEGORIES.find(([key]) => key === value)?.[1] ?? "Документ"; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatSize(bytes: number) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`; return `${(bytes / 1024 / 1024).toFixed(1)} МБ`; }
