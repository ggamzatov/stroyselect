"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { requireActiveProject } from "@/lib/projects/require-active-project";
import { bidSchema, type BidInput } from "@/features/bids/schemas/bid-schema";
import { createNotification } from "@/features/notifications/server/create-notification";

export type SaveBidResult = {
  success: boolean;
  message: string;
  bidId?: string;
};

type CompanyRow = {
  id: string;
  owner_id: string;
  public_name: string | null;
  verification_status: string;
  accepts_new_projects: boolean;
};

type ProjectRow = {
  id: string;
  customer_id: string;
  title: string;
  status: string;
  selected_contractor_id: string | null;
  is_admin_blocked: boolean;
  admin_block_reason: string | null;
};

type ExistingBidRow = {
  id: string;
  status: string;
};

type PostgresError = Error & { code?: string };

export async function saveBid(input: BidInput): Promise<SaveBidResult> {
  const parsed = bidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Проверьте предложение",
    };
  }

  const values = parsed.data;
  const activeUser = await requireActiveUser();
  if (!activeUser.success) {
    return { success: false, message: activeUser.message };
  }

  const { user, profile } = activeUser;
  if (profile.role !== "contractor") {
    return { success: false, message: "Оставлять предложения могут только подрядчики" };
  }

  const activeProject = await requireActiveProject(values.projectId);
  if (!activeProject.success) {
    return { success: false, message: activeProject.message };
  }

  const client = await db.connect();
  let savedBidId: string | undefined;
  let isNewBid = false;
  let notificationData: { customerId: string; projectTitle: string; company: CompanyRow } | null = null;

  try {
    await client.query("BEGIN");

    const companyResult = await client.query<CompanyRow>(`
      SELECT id, owner_id, public_name, verification_status, accepts_new_projects
      FROM public.contractor_companies
      WHERE owner_id = $1
      LIMIT 1
    `, [user.id]);
    const company = companyResult.rows[0];

    if (!company) {
      await client.query("ROLLBACK");
      return { success: false, message: "Компания подрядчика не найдена" };
    }
    if (company.verification_status !== "verified") {
      await client.query("ROLLBACK");
      return { success: false, message: "Компания должна пройти проверку администратора" };
    }
    if (!company.accepts_new_projects) {
      await client.query("ROLLBACK");
      return { success: false, message: "В профиле компании отключён приём новых проектов" };
    }

    const projectResult = await client.query<ProjectRow>(`
      SELECT id, customer_id, title, status, selected_contractor_id,
             is_admin_blocked, admin_block_reason
      FROM public.projects
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `, [values.projectId]);
    const project = projectResult.rows[0];

    if (!project) {
      await client.query("ROLLBACK");
      return { success: false, message: "Проект не найден" };
    }
    if (project.is_admin_blocked) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: project.admin_block_reason
          ? `Проект ограничен администрацией. Причина: ${project.admin_block_reason}`
          : "Проект ограничен администрацией",
      };
    }
    if (project.customer_id === user.id) {
      await client.query("ROLLBACK");
      return { success: false, message: "Нельзя оставить предложение на собственный проект" };
    }
    if (!["published", "collecting_bids"].includes(project.status) || project.selected_contractor_id) {
      await client.query("ROLLBACK");
      return { success: false, message: "На этот проект больше нельзя оставить предложение" };
    }

    const existingResult = await client.query<ExistingBidRow>(`
      SELECT id, status
      FROM public.project_bids
      WHERE project_id = $1 AND contractor_id = $2
      LIMIT 1
      FOR UPDATE
    `, [values.projectId, company.id]);
    const existingBid = existingResult.rows[0];

    if (existingBid && ["accepted", "rejected", "withdrawn"].includes(existingBid.status)) {
      await client.query("ROLLBACK");
      return { success: false, message: "Это предложение уже нельзя изменить" };
    }

    const completenessScore = calculateCompletenessScore(values);
    const params = [
      values.price,
      values.durationDays,
      values.proposedStartDate || null,
      values.message?.trim() || null,
      values.scopeSummary.trim(),
      values.materialsSummary.trim(),
      values.exclusions?.trim() || null,
      values.paymentTerms.trim(),
      values.warrantyMonths,
      values.priceIncludesMaterials,
      completenessScore,
    ];

    if (existingBid) {
      const result = await client.query<{ id: string }>(`
        UPDATE public.project_bids
        SET price = $1,
            duration_days = $2,
            proposed_start_date = $3,
            message = $4,
            scope_summary = $5,
            materials_summary = $6,
            exclusions = $7,
            payment_terms = $8,
            warranty_months = $9,
            price_includes_materials = $10,
            completeness_score = $11,
            updated_at = now()
        WHERE id = $12 AND contractor_id = $13
        RETURNING id
      `, [...params, existingBid.id, company.id]);
      savedBidId = result.rows[0]?.id;
    } else {
      try {
        const result = await client.query<{ id: string }>(`
          INSERT INTO public.project_bids (
            project_id, contractor_id, price, duration_days, proposed_start_date,
            message, scope_summary, materials_summary, exclusions, payment_terms,
            warranty_months, price_includes_materials, completeness_score, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'submitted'
          )
          RETURNING id
        `, [
          values.projectId,
          company.id,
          values.price,
          values.durationDays,
          values.proposedStartDate || null,
          values.message?.trim() || null,
          values.scopeSummary.trim(),
          values.materialsSummary.trim(),
          values.exclusions?.trim() || null,
          values.paymentTerms.trim(),
          values.warrantyMonths,
          values.priceIncludesMaterials,
          completenessScore,
        ]);
        savedBidId = result.rows[0]?.id;
        isNewBid = true;
      } catch (error) {
        if ((error as PostgresError).code === "23505") {
          await client.query("ROLLBACK");
          return { success: false, message: "Вы уже оставили предложение на этот проект" };
        }
        throw error;
      }
    }

    if (!savedBidId) throw new Error("Предложение не было сохранено");

    if (isNewBid) {
      const eventType = "bid_created";
      const eventTitle = "Получено новое предложение";
      const eventDescription = company.public_name
        ? `${company.public_name} оставил предложение`
        : "Подрядчик оставил предложение";
      const eventMetadata = JSON.stringify({
        bid_id: savedBidId,
        contractor_id: company.id,
        price: values.price,
        duration_days: values.durationDays,
        completeness_score: completenessScore,
      });

      await client.query(
        `
          INSERT INTO public.project_events (
            project_id,
            author_id,
            event_type,
            title,
            description,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          values.projectId,
          user.id,
          eventType,
          eventTitle,
          eventDescription,
          eventMetadata,
        ]
      );
    }

    notificationData = { customerId: project.customer_id, projectTitle: project.title, company };
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка сохранения предложения:", error);
    return { success: false, message: "Не удалось сохранить предложение" };
  } finally {
    client.release();
  }

  if (isNewBid && savedBidId && notificationData) {
    try {
      const contractorName = getContractorDisplayName({
        publicName: notificationData.company.public_name,
        firstName: profile.first_name,
        lastName: profile.last_name,
      });
      const notificationResult = await createNotification({
        userId: notificationData.customerId,
        actorId: user.id,
        notificationType: "new_bid",
        title: "Новое предложение",
        body: `${contractorName} оставил предложение по проекту «${notificationData.projectTitle}»`,
        projectId: values.projectId,
        url: `/customer/projects/${values.projectId}/bids/compare`,
        deduplicationKey: `new-bid:${savedBidId}:user:${notificationData.customerId}`,
        metadata: {
          bid_id: savedBidId,
          contractor_id: notificationData.company.id,
          price: values.price,
          duration_days: values.durationDays,
          completeness_score: calculateCompletenessScore(values),
        },
      });
      if (!notificationResult.success) {
        console.error("Ошибка уведомления о новом предложении:", notificationResult.message);
      }
    } catch (error) {
      console.error("Ошибка уведомления о новом предложении:", error);
    }
  }

  revalidateBidPages(values.projectId);
  return {
    success: true,
    message: isNewBid ? "Предложение отправлено" : "Предложение обновлено",
    bidId: savedBidId,
  };
}

function calculateCompletenessScore(values: BidInput) {
  let score = 45;
  if (values.proposedStartDate) score += 10;
  if (values.message) score += 5;
  if (values.scopeSummary) score += 15;
  if (values.materialsSummary) score += 10;
  if (values.paymentTerms) score += 10;
  if (values.warrantyMonths >= 0) score += 5;
  return Math.min(score, 100);
}

function revalidateBidPages(projectId: string) {
  revalidatePath(`/contractor/projects/${projectId}`);
  revalidatePath("/contractor/projects");
  revalidatePath("/contractor/bids");
  revalidatePath("/contractor/dashboard");
  revalidatePath(`/customer/projects/${projectId}`);
  revalidatePath(`/customer/projects/${projectId}/bids/compare`);
  revalidatePath("/customer/projects");
  revalidatePath("/customer/bids");
  revalidatePath("/customer/dashboard");
  revalidatePath("/customer", "layout");
}

function getContractorDisplayName({
  publicName,
  firstName,
  lastName,
}: {
  publicName: string | null;
  firstName: string | null;
  lastName: string | null;
}) {
  const normalizedPublicName = publicName?.trim();
  if (normalizedPublicName) return normalizedPublicName;
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Подрядчик";
}
