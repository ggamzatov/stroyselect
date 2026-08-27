"use client";

import Link from "next/link";
import {
  ExternalLink,
  FileClock,
  FileText,
  FolderOpen,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  deleteProjectDocument,
  uploadProjectDocumentFormAction,
} from "@/features/documents/actions/project-documents";

const CATEGORIES = [
  ["contract", "Договор"],
  ["estimate", "Смета"],
  ["act", "Акт"],
  ["invoice", "Счёт"],
  ["receipt", "Чек"],
  ["plan", "План"],
  ["photo", "Фото"],
  ["permit", "Разрешение"],
  ["warranty", "Гарантия"],
  ["other", "Другое"],
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

type Props = {
  projectId: string;
  role: "customer" | "contractor";
  documents: DocumentItem[];
  backHref: string;
};

export function ProjectDocumentCenter({ projectId, role, documents, backHref }: Props) {
  const categoriesCount = new Set(documents.map((document) => document.category)).size;
  const versionedCount = documents.filter((document) => document.version > 1).length;

  return (
    <main className="min-h-screen bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1420px]">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          ← Вернуться к проекту
        </Link>

        <section className="ui-v2-panel mt-4 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <FolderOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Файлы проекта</p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
                    Документы
                  </h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                Договоры, сметы, акты, счета, планы и гарантии собраны в одном защищённом разделе. Новые версии сохраняют историю и автора загрузки.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <Metric value={documents.length} label="файлов" icon={<FileText className="h-4 w-4" />} />
              <Metric value={categoriesCount} label="категорий" icon={<FolderOpen className="h-4 w-4" />} />
              <Metric value={versionedCount} label="версий" icon={<FileClock className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="ui-v2-panel order-2 p-4 sm:p-5 xl:order-1" aria-labelledby="project-files-title">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="project-files-title" className="text-lg font-black text-foreground">Файлы проекта</h2>
                <p className="mt-1 text-xs text-muted-foreground">Последние версии и история загрузок</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                {documents.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/20 hover:shadow-[var(--shadow-soft)] sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-bold text-foreground">{document.title}</h3>
                          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                            {categoryLabel(document.category)}
                          </span>
                          {document.version > 1 ? (
                            <span className="rounded-full bg-[#edf7ff] px-2.5 py-1 text-[11px] font-bold text-[#2474a6]">
                              версия {document.version}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                          {formatSize(document.fileSize)} · {document.uploaderName} · {formatDate(document.createdAt)}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground/70">{document.fileName}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
                      <a
                        href={document.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground transition hover:border-primary/25 hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        Открыть файл
                      </a>

                      <form action={uploadProjectDocumentFormAction}>
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="category" value={document.category} />
                        <input type="hidden" name="title" value={document.title} />
                        <input type="hidden" name="parentDocumentId" value={document.id} />
                        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground transition hover:border-primary/25 hover:text-primary">
                          <FileClock className="h-4 w-4" aria-hidden="true" />
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
                          title={`Скрыть документ ${document.title}`}
                          aria-label={`Скрыть документ ${document.title}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}

              {documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">Документов пока нет</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Первый файл можно загрузить в форме рядом.</p>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="order-1 space-y-4 xl:order-2">
            <section className="ui-v2-panel p-5 sm:p-6" aria-labelledby="upload-document-title">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <UploadCloud className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="upload-document-title" className="font-black text-foreground">Добавить файл</h2>
                  <p className="text-xs text-muted-foreground">PDF, изображения, Word и Excel</p>
                </div>
              </div>

              <form action={uploadProjectDocumentFormAction} className="mt-5 space-y-4">
                <input type="hidden" name="projectId" value={projectId} />

                <label className="block text-xs font-bold text-foreground">
                  Название
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={240}
                    placeholder="Например, смета на электрику"
                    className="stroy-input mt-2"
                  />
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Категория
                  <select name="category" defaultValue="other" className="stroy-input mt-2">
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-bold text-foreground">
                  Файл
                  <input
                    name="file"
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
                    aria-label="Выбрать файл документа"
                    className="stroy-input mt-2"
                  />
                </label>

                <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.18)] transition hover:-translate-y-0.5 hover:bg-[#076c47]">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Загрузить документ
                </button>
              </form>
            </section>

            <section className="ui-v2-panel p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Приватное хранение</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Файлы доступны только участникам проекта. Ссылки на скачивание действуют ограниченное время.
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-primary">
                    Вы вошли как {role === "customer" ? "заказчик" : "подрядчик"}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3 text-center">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
      <p className="mt-2 text-xl font-black tracking-[-0.03em] text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
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
