"use client";

import Link from "next/link";
import {
  FileStack,
  FileText,
  FolderOpen,
  Layers3,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import {
  deleteProjectDocument,
  uploadProjectDocumentFormAction,
} from "@/features/documents/actions/project-documents";
import { WorkspaceOperationHeader } from "@/features/workspace/components/workspace-operation-header";

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
  const categoryCount = new Set(documents.map((document) => document.category)).size;
  const versionCount = documents.reduce((total, document) => total + Math.max(document.version, 1), 0);

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <WorkspaceOperationHeader
          backHref={backHref}
          kicker="Документы проекта"
          title="Единый центр файлов"
          icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
          description={
            <>
              Договоры, сметы, акты, счета, планы и гарантии хранятся в приватном хранилище. Каждая новая версия остаётся отдельной записью с автором и временем загрузки.
            </>
          }
          metrics={[
            { label: "Файлов", value: documents.length, icon: <FileText className="h-4 w-4" />, tone: "green" },
            { label: "Категорий", value: categoryCount, icon: <FileStack className="h-4 w-4" />, tone: "blue" },
            { label: "Версий", value: versionCount, icon: <Layers3 className="h-4 w-4" /> },
          ]}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="order-2 space-y-3 xl:order-1" aria-labelledby="project-documents-list">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 id="project-documents-list" className="text-lg font-black tracking-[-0.02em] text-foreground">
                  Файлы проекта
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {documents.length > 0 ? `Всего записей: ${documents.length}` : "Документы появятся здесь после загрузки"}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {role === "customer" ? "Заказчик" : "Подрядчик"}
              </span>
            </div>

            {documents.map((document) => (
              <article
                key={document.id}
                className="ui-v2-panel flex flex-col gap-4 p-4 transition hover:border-primary/20 hover:shadow-[var(--shadow-card)] sm:p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate font-black text-foreground">{document.title}</p>
                      <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {categoryLabel(document.category)}
                      </span>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        v{document.version}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                      {formatSize(document.fileSize)} · {document.uploaderName} · {formatDate(document.createdAt)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/75">{document.fileName}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <a
                    href={document.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground transition hover:bg-secondary"
                  >
                    Открыть
                  </a>
                  <form action={uploadProjectDocumentFormAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="category" value={document.category} />
                    <input type="hidden" name="title" value={document.title} />
                    <input type="hidden" name="parentDocumentId" value={document.id} />
                    <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-primary/20 bg-secondary px-4 text-xs font-bold text-primary transition hover:bg-accent">
                      Новая версия
                      <input
                        name="file"
                        type="file"
                        required
                        aria-label={`Выбрать новую версию документа ${document.title}`}
                        className="sr-only"
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                      />
                    </label>
                  </form>
                  <form action={deleteProjectDocument}>
                    <input type="hidden" name="id" value={document.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <button
                      type="submit"
                      aria-label={`Скрыть документ ${document.title}`}
                      title="Скрыть документ"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>
              </article>
            ))}

            {documents.length === 0 ? (
              <div className="ui-v2-panel flex min-h-[260px] items-center justify-center border-dashed px-6 text-center">
                <div className="max-w-sm">
                  <FileStack className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-black">Документов пока нет</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Добавьте первый договор, смету, акт или другой файл проекта.
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="order-1 space-y-4 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6 xl:sticky xl:top-24">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-black text-foreground">Добавить документ</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Новая запись в центре файлов</p>
                </div>
              </div>

              <form action={uploadProjectDocumentFormAction} className="mt-5 space-y-3">
                <input type="hidden" name="projectId" value={projectId} />

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Название
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={240}
                    placeholder="Например: Смета на электрику"
                    className="stroy-input min-h-11"
                  />
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Категория
                  <select name="category" defaultValue="other" className="stroy-input min-h-11">
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-xs font-bold text-foreground">
                  Файл
                  <input
                    name="file"
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
                    aria-label="Выбрать файл документа"
                    className="stroy-input min-h-11 py-2"
                  />
                </label>

                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)]">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Загрузить
                </button>
              </form>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p>Ссылки на скачивание действуют ограниченное время. Файлы доступны только участникам проекта.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function categoryLabel(value: string) {
  return CATEGORIES.find(([key]) => key === value)?.[1] ?? "Документ";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}
