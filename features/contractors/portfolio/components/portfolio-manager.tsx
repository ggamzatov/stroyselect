"use client";

import {
  useState,
} from "react";

import {
  Building2,
  ImageIcon,
  MapPin,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import { PortfolioProjectForm } from
  "@/features/contractors/portfolio/components/portfolio-project-form";

import { PortfolioFileUpload } from
  "@/features/contractors/portfolio/components/portfolio-file-upload";

import { PortfolioGallery } from
  "@/features/contractors/portfolio/components/portfolio-gallery";

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

  contractor_portfolio_files?:
    PortfolioFile[];
};

type Props = {
  portfolio:
    PortfolioProject[];
};

type Mode =
  | "closed"
  | "create"
  | "edit";

export function PortfolioManager({
  portfolio,
}: Props) {
  const [
    mode,
    setMode,
  ] = useState<Mode>(
    "closed"
  );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const editingProject =
    portfolio.find(
      (project) =>
        project.id ===
        editingId
    ) ?? null;

  function openCreate() {
    setEditingId(null);
    setMode("create");
  }

  function openEdit(
    projectId: string
  ) {
    setEditingId(
      projectId
    );

    setMode("edit");
  }

  function closeForm() {
    setEditingId(null);
    setMode("closed");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Портфолио
          </p>

          <h2 className="mt-1 text-2xl font-bold text-foreground">
            Выполненные объекты
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Добавляйте реальные проекты,
            фотографии и описание выполненных работ.
          </p>
        </div>

        {mode === "closed" ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(107,70,50,0.16)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a]"
          >
            <Plus className="h-4 w-4" />
            Добавить объект
          </button>
        ) : (
          <button
            type="button"
            onClick={closeForm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/50"
          >
            <X className="h-4 w-4" />
            Закрыть форму
          </button>
        )}
      </div>

      {mode === "create" && (
        <div className="rounded-[1.5rem] border border-border bg-secondary/30 p-5 md:p-6">
          <p className="text-sm font-semibold text-primary">
            Новый объект
          </p>

          <h3 className="mt-1 text-lg font-bold text-foreground">
            Добавление работы в портфолио
          </h3>

          <div className="mt-5">
            <PortfolioProjectForm
              onClose={closeForm}
            />
          </div>
        </div>
      )}

      {mode === "edit" &&
        editingProject && (
          <div className="rounded-[1.5rem] border border-primary/20 bg-secondary/30 p-5 md:p-6">
            <p className="text-sm font-semibold text-primary">
              Редактирование
            </p>

            <h3 className="mt-1 text-lg font-bold text-foreground">
              {editingProject.title}
            </h3>

            <div className="mt-5">
              <PortfolioProjectForm
                key={
                  editingProject.id
                }
                project={
                  editingProject
                }
                onClose={
                  closeForm
                }
              />
            </div>
          </div>
        )}

      {portfolio.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-background/60 p-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Building2 className="h-6 w-6" />
          </div>

          <h3 className="mt-4 text-lg font-bold text-foreground">
            Портфолио пока пусто
          </h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Добавьте первый выполненный
            объект и затем загрузите фотографии.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {portfolio.map(
            (project) => {
              const files =
                project
                  .contractor_portfolio_files ??
                [];

              const sortedFiles =
                [...files].sort(
                    (
                    first,
                    second
                    ) =>
                    Number(
                        first.sort_order ?? 0
                    ) -
                    Number(
                        second.sort_order ?? 0
                    )
                );

                const cover =
                sortedFiles.find(
                    (file) =>
                    file.signed_url
                ) ?? null;

              return (
                <article
                  key={
                    project.id
                  }
                  className="overflow-hidden rounded-[1.5rem] border border-border bg-background/60"
                >
                  <div className="relative flex h-52 items-center justify-center overflow-hidden bg-secondary/50">
                    {cover?.signed_url ? (
                      <img
                        src={
                          cover.signed_url
                        }
                        alt={
                          project.title
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-8 w-8 text-primary" />

                        <p className="mt-2 text-xs text-muted-foreground">
                          Фотографий пока нет
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          project.id
                        )
                      }
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/75"
                      title="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
                      Выполненный объект
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-foreground">
                      {project.title}
                    </h3>

                    {(project.city ||
                      project.completed_year) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {project.city && (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {project.city}
                            </span>
                          </>
                        )}

                        {project.city &&
                          project.completed_year && (
                            <span>·</span>
                          )}

                        {project.completed_year && (
                          <span>
                            {project.completed_year}
                          </span>
                        )}
                      </div>
                    )}

                    {project.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-5 border-t border-border pt-5">
                        <PortfolioFileUpload
                            portfolioProjectId={
                            project.id
                            }
                        />
                        {files.length > 0 && (
                            <div className="mt-5">
                                <PortfolioGallery
                                files={files}
                                />
                            </div>
                            )}
                        </div>

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ImageIcon className="h-4 w-4 text-primary" />

                        <span>
                          {files.length}{" "}
                          {formatPhotoCount(
                            files.length
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            project.id
                          )
                        }
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                        Редактировать
                      </button>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function formatPhotoCount(
  count: number
) {
  const lastTwo =
    count % 100;

  const last =
    count % 10;

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return "фотографий";
  }

  if (last === 1) {
    return "фотография";
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return "фотографии";
  }

  return "фотографий";
}