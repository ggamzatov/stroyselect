"use client";

import {
  useState,
  useTransition,
} from "react";

import { useRouter } from
  "next/navigation";

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
    <div>
      <button
        type="button"
        onClick={
          handlePublish
        }
        disabled={
          isPending
        }
        className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Публикуем..."
          : "Опубликовать проект"}
      </button>

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </p>
      )}
    </div>
  );
}