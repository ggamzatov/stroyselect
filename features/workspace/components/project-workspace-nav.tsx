"use client"

import { ProjectNav } from "@/components/navigation/project-nav"

type Props = {
  projectId: string
  role: "customer" | "contractor"
  executionUnlocked?: boolean
}

/** Existing feature API preserved while navigation presentation is centralized. */
export function ProjectWorkspaceNav(props: Props) {
  return <ProjectNav {...props} />
}
