import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getProjectAdvisorData } from "@/features/projects/queries/get-project-advisor-data";
import { getProjectContractorMatches } from "@/features/projects/queries/get-project-contractor-matches";
import {
  ProjectAdvisorBoard,
  type AdvisorCandidate,
} from "@/features/projects/components/project-advisor-board";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectAdvisorPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const [advisor, matches] = await Promise.all([
    getProjectAdvisorData(id),
    getProjectContractorMatches(id, 12),
  ]);

  const candidateMap = new Map<string, AdvisorCandidate>();

  for (const candidate of advisor.candidates) {
    candidateMap.set(candidate.contractorId, {
      contractorId: candidate.contractorId,
      publicName: candidate.publicName,
      rating: candidate.rating,
      ratingCount: candidate.ratingCount,
      completedProjectsCount: candidate.completedProjectsCount,
      stroySelectScore: candidate.stroySelectScore,
      matchScore: null,
      stage: candidate.stage,
      note: candidate.note,
      lastContactAt: candidate.lastContactAt,
      nextFollowUpAt: candidate.nextFollowUpAt,
      bid: candidate.bid,
    });
  }

  for (const match of matches) {
    const existing = candidateMap.get(match.contractorId);
    if (existing) {
      existing.matchScore = match.matchScore;
      if (existing.stroySelectScore === 0) {
        existing.stroySelectScore = match.recommendationScore;
      }
      continue;
    }

    candidateMap.set(match.contractorId, {
      contractorId: match.contractorId,
      publicName: match.publicName,
      rating: match.rating,
      ratingCount: match.ratingCount,
      completedProjectsCount: match.completedProjectsCount,
      stroySelectScore: match.recommendationScore,
      matchScore: match.matchScore,
      stage: "new",
      note: "",
      lastContactAt: null,
      nextFollowUpAt: null,
      bid: null,
    });
  }

  const candidates = Array.from(candidateMap.values()).sort((a, b) => {
    if (a.stage === "selected") return -1;
    if (b.stage === "selected") return 1;
    const stageWeight = (stage: string) => {
      switch (stage) {
        case "finalist": return 7;
        case "proposal_received": return 6;
        case "contacted": return 5;
        case "shortlisted": return 4;
        case "viewed": return 3;
        case "new": return 2;
        case "archived": return 0;
        default: return 1;
      }
    };
    const byStage = stageWeight(b.stage) - stageWeight(a.stage);
    if (byStage !== 0) return byStage;
    return (b.matchScore ?? b.stroySelectScore) - (a.matchScore ?? a.stroySelectScore);
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container py-8 md:py-12">
        <Link
          href={`/customer/projects/${advisor.project.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к проекту
        </Link>

        <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-4 w-4" />
              StroySelect Project Advisor
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground md:text-5xl">
              Воронка выбора подрядчика
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
              Проект «{advisor.project.title}». В одном месте: shortlist, контакты, предложения, follow-up задачи и история решений.
            </p>
          </div>
        </section>

        <div className="mt-6">
          <ProjectAdvisorBoard
            projectId={advisor.project.id}
            candidates={candidates}
            tasks={advisor.tasks}
            activity={advisor.activity}
          />
        </div>
      </div>
    </main>
  );
}
