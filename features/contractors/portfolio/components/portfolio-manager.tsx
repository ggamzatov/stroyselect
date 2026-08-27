"use client";

import { useState } from "react";
import { Building2, ImageIcon, MapPin, Pencil, Plus, X } from "lucide-react";

import { PortfolioProjectForm } from "@/features/contractors/portfolio/components/portfolio-project-form";
import { PortfolioFileUpload } from "@/features/contractors/portfolio/components/portfolio-file-upload";
import { PortfolioGallery } from "@/features/contractors/portfolio/components/portfolio-gallery";

type PortfolioFile = {
  id: string;
  portfolio_project_id: string;
  uploaded_by: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_size: number | string;
  mime_type: string;
  sort_order: number;
  created_at: string;
  signed_url: string | null;
};

type PortfolioProject = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  completed_year: number | null;
  contractor_portfolio_files?: PortfolioFile[];
};

type Props = {
  portfolio: PortfolioProject[];
};

type Mode = "closed" | "create" | "edit";

export function PortfolioManager({ portfolio }: Props) {
  const [mode, setMode] = useState<Mode>("closed");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingProject =
    portfolio.find((project) => project.id === editingId) ?? null;

  function openCreate() {
    setEditingId(null);
    setMode("create");
  }

  function openEdit(projectId: string) {
    setEditingId(projectId);
    setMode("edit");
  }

  function closeForm() {
    setEditingId(null);
    setMode("closed");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {portfolio.length > 0
              ? `${portfolio.length} ${formatObjectCount(portfolio.length)}`
              : "Пока нет выполненных объектов"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Добавляйте только реальные работы — они отображаются заказчикам в публичном профиле.
          </p>
        </div>

        {mode === "closed" ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(8,122,80,0.20)] transition hover:-translate-y-0.5 hover:bg-[#076c47]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить объект
          </button>
        ) : (
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Закрыть форму
          </button>
        )}
      </div>

      {mode === "create" ? (
        <div className="rounded-2xl border border-primary/15 bg-secondary/35 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Новый объект</p>
          <h3 className="mt-1 text-lg font-black text-foreground">Добавление работы в портфолио</h3>
          <div className="mt-5">
            <PortfolioProjectForm onClose={closeForm} />
          </div>
        </div>
      ) : null}

      {mode === "edit" && editingProject ? (
        <div className="rounded-2xl border border-primary/15 bg-secondary/35 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Редактирование</p>
          <h3 className="mt-1 text-lg font-black text-foreground">{editingProject.title}</h3>
          <div className="mt-5">
            <PortfolioProjectForm
              key={editingProject.id}
              project={editingProject}
              onClose={closeForm}
            />
          </div>
        </div>
      ) : null}

      {portfolio.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/45 p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-black text-foreground">Портфолио пока пусто</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Добавьте первый завершённый объект, описание работы и фотографии результата.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {portfolio.map((project) => {
            const files = project.contractor_portfolio_files ?? [];
            const sortedFiles = [...files].sort(
              (first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0)
            );
            const cover = sortedFiles.find((file) => file.signed_url) ?? null;

            return (
              <article
                key={project.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="relative flex h-52 items-center justify-center overflow-hidden bg-secondary/50">
                  {cover?.signed_url ? (
                    <img
                      src={cover.signed_url}
                      alt={project.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
                      <p className="mt-2 text-xs text-muted-foreground">Фотографий пока нет</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(project.id)}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75"
                    aria-label={`Редактировать объект ${project.title}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Выполненный объект</p>
                      <h3 className="mt-2 break-words text-lg font-black text-foreground">{project.title}</h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-primary">
                      {files.length} {formatPhotoCount(files.length)}
                    </span>
                  </div>

                  {project.city || project.completed_year ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {project.city ? (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <span>{project.city}</span>
                        </>
                      ) : null}
                      {project.city && project.completed_year ? <span>·</span> : null}
                      {project.completed_year ? <span>{project.completed_year}</span> : null}
                    </div>
                  ) : null}

                  {project.description ? (
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}

                  <div className="mt-5 border-t border-border pt-5">
                    <PortfolioFileUpload portfolioProjectId={project.id} />
                    {files.length > 0 ? (
                      <div className="mt-5">
                        <PortfolioGallery files={files} />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex justify-end border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => openEdit(project.id)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary transition hover:bg-secondary"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Редактировать
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatObjectCount(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "объектов";
  if (last === 1) return "объект";
  if (last >= 2 && last <= 4) return "объекта";
  return "объектов";
}

function formatPhotoCount(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "фотографий";
  if (last === 1) return "фотография";
  if (last >= 2 && last <= 4) return "фотографии";
  return "фотографий";
}
