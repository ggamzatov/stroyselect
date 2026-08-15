import "server-only";

import { redirect } from "next/navigation";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { getSignedFileUrl } from "@/lib/storage/get-signed-file-url";

const PROJECT_FILES_BUCKET = "project-files";

type ProjectRow = {
  id: string;
  customer_id: string;
  selected_contractor_id: string | null;
  category_id: number | string | null;
  title: string;
  description: string | null;
  property_type: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  budget_min: string | number | null;
  budget_max: string | number | null;
  desired_start_date: Date | string | null;
  desired_end_date: Date | string | null;
  status: string;
  published_at: Date | string | null;
  contractor_selected_at: Date | string | null;
  work_started_at: Date | string | null;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CustomerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
};

type ContractorRow = {
  id: string;
  owner_id: string;
  public_name: string;
  legal_name: string | null;
  company_type: string | null;
  rating: string | number;
  rating_count: number;
  verification_status: string;
  contact_phone: string | null;
  contact_email: string | null;
};

type BidRow = {
  id: string;
  project_id: string;
  contractor_id: string;
  price: string | number;
  duration_days: number;
  message: string | null;
  proposed_start_date: Date | string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type StageRow = {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  description: string | null;
  price: string | number | null;
  progress_weight: number;
  sort_order: number;
  status: string;
  planned_start_date: Date | string | null;
  planned_end_date: Date | string | null;
  actual_started_at: Date | string | null;
  actual_completed_at: Date | string | null;
  submitted_for_review_at: Date | string | null;
  reviewed_at: Date | string | null;
  reviewed_by: string | null;
  customer_review_comment: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type EventRow = {
  id: string;
  project_id: string;
  author_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
};

type FileRow = {
  id: string;
  project_id: string;
  stage_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  file_size: string | number;
  mime_type: string;
  file_category: string;
  description: string | null;
  created_at: Date | string;
};

export async function getProjectWorkspace(projectId: string) {
  const activeUser = await requireActiveUser();

  if (!activeUser.success) {
    if (activeUser.reason === "blocked") {
      redirect("/account-blocked");
    }

    redirect("/login");
  }

  const { user, profile } = activeUser;

  const projectResult = await db.query<ProjectRow>(
    `
      SELECT
        id,
        customer_id,
        selected_contractor_id,
        category_id,
        title,
        description,
        property_type,
        region,
        city,
        address,
        budget_min,
        budget_max,
        desired_start_date,
        desired_end_date,
        status,
        published_at,
        contractor_selected_at,
        work_started_at,
        completed_at,
        created_at,
        updated_at
      FROM public.projects
      WHERE id = $1
      LIMIT 1
    `,
    [projectId]
  );

  const rawProject = projectResult.rows[0];

  if (!rawProject) {
    throw new Error("Проект не найден");
  }

  let currentContractorCompany: { id: string } | null = null;

  if (profile.role === "customer") {
    if (rawProject.customer_id !== user.id) {
      redirect("/customer/dashboard");
    }
  } else if (profile.role === "contractor") {
    const companyResult = await db.query<{ id: string }>(
      `
        SELECT id
        FROM public.contractor_companies
        WHERE owner_id = $1
        LIMIT 1
      `,
      [user.id]
    );

    const company = companyResult.rows[0];

    if (!company) {
      redirect("/contractor/dashboard");
    }

    currentContractorCompany = company;

    if (rawProject.selected_contractor_id !== company.id) {
      redirect("/contractor/dashboard");
    }
  } else if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const [
    customerResult,
    contractorResult,
    selectedBidResult,
    stagesResult,
    eventsResult,
    filesResult,
  ] = await Promise.all([
    db.query<CustomerRow>(
      `
        SELECT id, first_name, last_name, phone, city
        FROM public.profiles
        WHERE id = $1
        LIMIT 1
      `,
      [rawProject.customer_id]
    ),

    rawProject.selected_contractor_id
      ? db.query<ContractorRow>(
          `
            SELECT
              id,
              owner_id,
              public_name,
              legal_name,
              company_type,
              rating,
              rating_count,
              verification_status,
              contact_phone,
              contact_email
            FROM public.contractor_companies
            WHERE id = $1
            LIMIT 1
          `,
          [rawProject.selected_contractor_id]
        )
      : Promise.resolve({ rows: [] as ContractorRow[] }),

    rawProject.selected_contractor_id
      ? db.query<BidRow>(
          `
            SELECT
              id,
              project_id,
              contractor_id,
              price,
              duration_days,
              message,
              proposed_start_date,
              status,
              created_at,
              updated_at
            FROM public.project_bids
            WHERE project_id = $1
              AND contractor_id = $2
              AND status = 'accepted'
            LIMIT 1
          `,
          [projectId, rawProject.selected_contractor_id]
        )
      : Promise.resolve({ rows: [] as BidRow[] }),

    db.query<StageRow>(
      `
        SELECT
          id,
          project_id,
          created_by,
          title,
          description,
          price,
          progress_weight,
          sort_order,
          status,
          planned_start_date,
          planned_end_date,
          actual_started_at,
          actual_completed_at,
          submitted_for_review_at,
          reviewed_at,
          reviewed_by,
          customer_review_comment,
          created_at,
          updated_at
        FROM public.project_stages
        WHERE project_id = $1
        ORDER BY sort_order ASC
      `,
      [projectId]
    ),

    db.query<EventRow>(
      `
        SELECT
          id,
          project_id,
          author_id,
          event_type,
          title,
          description,
          metadata,
          created_at
        FROM public.project_events
        WHERE project_id = $1
        ORDER BY created_at DESC
      `,
      [projectId]
    ),

    db.query<FileRow>(
      `
        SELECT
          id,
          project_id,
          stage_id,
          uploaded_by,
          file_name,
          storage_path,
          file_size,
          mime_type,
          file_category,
          description,
          created_at
        FROM public.project_stage_files
        WHERE project_id = $1
        ORDER BY created_at DESC
      `,
      [projectId]
    ),
  ]);

  const files = await Promise.all(
    filesResult.rows.map(async (file) => {
      let signedUrl: string | null = null;

      try {
        signedUrl = await getSignedFileUrl({
          bucket: PROJECT_FILES_BUCKET,
          key: file.storage_path,
          expiresIn: 60 * 60,
        });
      } catch (error) {
        console.error("Ошибка создания временной ссылки файла проекта:", {
          fileId: file.id,
          storagePath: file.storage_path,
          error,
        });
      }

      return {
        ...file,
        created_at: toIsoString(file.created_at),
        signed_url: signedUrl,
      };
    })
  );

  const project = {
    ...rawProject,
    desired_start_date: toNullableDateString(rawProject.desired_start_date),
    desired_end_date: toNullableDateString(rawProject.desired_end_date),
    published_at: toNullableIsoString(rawProject.published_at),
    contractor_selected_at: toNullableIsoString(rawProject.contractor_selected_at),
    work_started_at: toNullableIsoString(rawProject.work_started_at),
    completed_at: toNullableIsoString(rawProject.completed_at),
    created_at: toIsoString(rawProject.created_at),
    updated_at: toIsoString(rawProject.updated_at),
  };

  const selectedBid = selectedBidResult.rows[0]
    ? {
        ...selectedBidResult.rows[0],
        proposed_start_date: toNullableDateString(
          selectedBidResult.rows[0].proposed_start_date
        ),
        created_at: toIsoString(selectedBidResult.rows[0].created_at),
        updated_at: toIsoString(selectedBidResult.rows[0].updated_at),
      }
    : null;

  const stages = stagesResult.rows.map((stage) => ({
    ...stage,
    planned_start_date: toNullableDateString(stage.planned_start_date),
    planned_end_date: toNullableDateString(stage.planned_end_date),
    actual_started_at: toNullableIsoString(stage.actual_started_at),
    actual_completed_at: toNullableIsoString(stage.actual_completed_at),
    submitted_for_review_at: toNullableIsoString(stage.submitted_for_review_at),
    reviewed_at: toNullableIsoString(stage.reviewed_at),
    created_at: toIsoString(stage.created_at),
    updated_at: toIsoString(stage.updated_at),
  }));

  const events = eventsResult.rows.map((event) => ({
    ...event,
    created_at: toIsoString(event.created_at),
  }));

  const customer = customerResult.rows[0]
    ? {
        ...customerResult.rows[0],
        first_name: customerResult.rows[0].first_name ?? "",
      }
    : null;

  return {
    currentUser: {
      id: user.id,
      role: profile.role,
      firstName: profile.first_name,
      lastName: profile.last_name,
      contractorCompanyId: currentContractorCompany?.id ?? null,
    },
    project,
    customer,
    contractor: contractorResult.rows[0] ?? null,
    selectedBid,
    stages,
    events,
    files,
  };
}

function toNullableDateString(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

function toNullableIsoString(value: Date | string | null) {
  if (!value) return null;
  return toIsoString(value);
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

export type ProjectWorkspace = Awaited<ReturnType<typeof getProjectWorkspace>>;
