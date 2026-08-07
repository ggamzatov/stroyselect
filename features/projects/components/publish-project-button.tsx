"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

import {
  CheckCircle2,
  Loader2,
  Send,
  TriangleAlert,
} from "lucide-react";

import { publishProject } from
  "@/features/projects/actions/publish-project";

type Props = {
  projectId: string;
  projectTitle?: string;
};

export function PublishProjectButton({
  projectId,
  projectTitle,
}: Props) {
  const router =
    useRouter();

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function handlePublish() {
    const confirmed =
      window.confirm(
        projectTitle
          ? `Опубликовать проект «${projectTitle}»? После публикации он станет доступен подрядчикам.`
          : "Опубликовать проект? После публикации он станет доступен подрядчикам."
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const result =
        await publishProject(
          projectId
        );

      if (!result.success) {
        setErrorMessage(
          result.message
        );

        return;
      }

      setSuccessMessage(
        result.message
      );

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={
          handlePublish
        }
        disabled={
          isPending
        }
        className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(107,70,50,0.20)] transition hover:-translate-y-0.5 hover:bg-[#5c3b2a] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-60"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </span>

          {isPending
            ? "Публикуем..."
            : "Опубликовать проект"}
        </span>

        {!isPending && (
          <span className="text-lg transition group-hover:translate-x-0.5">
            →
          </span>
        )}
      </button>

      {errorMessage && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Не удалось опубликовать проект
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-semibold">
                Проект опубликован
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}