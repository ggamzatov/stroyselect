import "server-only";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

type AnalyticsRow = {
  total_users: string | number;
  customers: string | number;
  contractors: string | number;
  total_companies: string | number;
  verified_contractors: string | number;
  accepting_contractors: string | number;
  total_projects: string | number;
  published_projects: string | number;
  projects_with_bids: string | number;
  selected_projects: string | number;
  completed_projects: string | number;
  blocked_projects: string | number;
  total_bids: string | number;
  submitted_bids: string | number;
  accepted_bids: string | number;
  average_bid_completeness: string | number | null;
  total_reviews: string | number;
  average_rating: string | number | null;
  open_disputes: string | number;
  critical_disputes: string | number;
};

export type MarketplaceAnalytics = {
  users: {
    total: number;
    customers: number;
    contractors: number;
  };
  contractors: {
    total: number;
    verified: number;
    acceptingNewProjects: number;
    verificationRate: number;
    availabilityRate: number;
  };
  projects: {
    total: number;
    published: number;
    withBids: number;
    selected: number;
    completed: number;
    blocked: number;
    projectToBidRate: number;
    bidToSelectionRate: number;
    selectionToCompletionRate: number;
  };
  bids: {
    total: number;
    submitted: number;
    accepted: number;
    averageCompleteness: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
  risk: {
    openDisputes: number;
    criticalDisputes: number;
  };
};

export async function getMarketplaceAnalytics(): Promise<MarketplaceAnalytics> {
  await requireStaffUser();

  const result = await db.query<AnalyticsRow>(`
    WITH
    user_stats AS (
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role::text = 'customer') AS customers,
        COUNT(*) FILTER (WHERE role::text = 'contractor') AS contractors
      FROM public.profiles
    ),
    contractor_stats AS (
      SELECT
        COUNT(*) AS total_companies,
        COUNT(*) FILTER (WHERE verification_status::text = 'verified') AS verified_contractors,
        COUNT(*) FILTER (
          WHERE verification_status::text = 'verified'
            AND accepts_new_projects = true
        ) AS accepting_contractors
      FROM public.contractor_companies
    ),
    project_stats AS (
      SELECT
        COUNT(*) AS total_projects,
        COUNT(*) FILTER (
          WHERE p.status::text IN (
            'published', 'collecting_bids', 'contractor_selected',
            'in_progress', 'completed', 'disputed'
          )
        ) AS published_projects,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM public.project_bids b
            WHERE b.project_id = p.id
              AND b.status::text <> 'withdrawn'
          )
        ) AS projects_with_bids,
        COUNT(*) FILTER (
          WHERE p.selected_contractor_id IS NOT NULL
             OR p.status::text IN ('contractor_selected', 'in_progress', 'completed', 'disputed')
        ) AS selected_projects,
        COUNT(*) FILTER (WHERE p.status::text = 'completed') AS completed_projects,
        COUNT(*) FILTER (WHERE p.is_admin_blocked = true) AS blocked_projects
      FROM public.projects p
    ),
    bid_stats AS (
      SELECT
        COUNT(*) AS total_bids,
        COUNT(*) FILTER (WHERE status::text = 'submitted') AS submitted_bids,
        COUNT(*) FILTER (WHERE status::text = 'accepted') AS accepted_bids,
        AVG(completeness_score) AS average_bid_completeness
      FROM public.project_bids
    ),
    review_stats AS (
      SELECT
        COUNT(*) AS total_reviews,
        AVG(rating) FILTER (WHERE moderation_status::text = 'published') AS average_rating
      FROM public.contractor_reviews
    ),
    dispute_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE status::text IN ('open', 'under_review')) AS open_disputes,
        COUNT(*) FILTER (
          WHERE status::text IN ('open', 'under_review')
            AND priority::text = 'critical'
        ) AS critical_disputes
      FROM public.project_disputes
    )
    SELECT *
    FROM user_stats, contractor_stats, project_stats, bid_stats, review_stats, dispute_stats
  `);

  const row = result.rows[0];
  const number = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const rate = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0;

  const totalCompanies = number(row?.total_companies);
  const verifiedContractors = number(row?.verified_contractors);
  const publishedProjects = number(row?.published_projects);
  const projectsWithBids = number(row?.projects_with_bids);
  const selectedProjects = number(row?.selected_projects);
  const completedProjects = number(row?.completed_projects);

  return {
    users: {
      total: number(row?.total_users),
      customers: number(row?.customers),
      contractors: number(row?.contractors),
    },
    contractors: {
      total: totalCompanies,
      verified: verifiedContractors,
      acceptingNewProjects: number(row?.accepting_contractors),
      verificationRate: rate(verifiedContractors, totalCompanies),
      availabilityRate: rate(number(row?.accepting_contractors), verifiedContractors),
    },
    projects: {
      total: number(row?.total_projects),
      published: publishedProjects,
      withBids: projectsWithBids,
      selected: selectedProjects,
      completed: completedProjects,
      blocked: number(row?.blocked_projects),
      projectToBidRate: rate(projectsWithBids, publishedProjects),
      bidToSelectionRate: rate(selectedProjects, projectsWithBids),
      selectionToCompletionRate: rate(completedProjects, selectedProjects),
    },
    bids: {
      total: number(row?.total_bids),
      submitted: number(row?.submitted_bids),
      accepted: number(row?.accepted_bids),
      averageCompleteness: Math.round(number(row?.average_bid_completeness)),
    },
    reviews: {
      total: number(row?.total_reviews),
      averageRating: Math.round(number(row?.average_rating) * 10) / 10,
    },
    risk: {
      openDisputes: number(row?.open_disputes),
      criticalDisputes: number(row?.critical_disputes),
    },
  };
}
