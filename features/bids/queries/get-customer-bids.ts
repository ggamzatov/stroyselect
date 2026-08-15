import "server-only";

import { redirect } from "next/navigation";

import { db } from
  "@/lib/db/pool";

import {
  getCurrentSessionUserId,
} from
  "@/lib/auth/session";

type BidRow = {
  id: string;
  project_id: string;
  contractor_id: string;

  price:
    string | number;

  duration_days:
    number;

  message:
    string | null;

  proposed_start_date:
    Date | string | null;

  status:
    string;

  created_at:
    Date | string;

  updated_at:
    Date | string;

  project_title:
    string;

  project_city:
    string | null;

  project_customer_id:
    string;

  project_status:
    string;

  company_public_name:
    string;

  company_legal_name:
    string | null;

  company_type:
    string | null;

  company_rating:
    string | number;

  company_rating_count:
    number;

  company_verification_status:
    string;

  company_contact_phone:
    string | null;

  company_contact_email:
    string | null;
};

export async function getCustomerBids() {
  const userId =
    await getCurrentSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  try {
    const result =
      await db.query<BidRow>(
        `
          SELECT
            pb.id,
            pb.project_id,
            pb.contractor_id,
            pb.price,
            pb.duration_days,
            pb.message,
            pb.proposed_start_date,
            pb.status,
            pb.created_at,
            pb.updated_at,

            p.title
              AS project_title,

            p.city
              AS project_city,

            p.customer_id
              AS project_customer_id,

            p.status
              AS project_status,

            cc.public_name
              AS company_public_name,

            cc.legal_name
              AS company_legal_name,

            cc.company_type,

            cc.rating
              AS company_rating,

            cc.rating_count
              AS company_rating_count,

            cc.verification_status
              AS company_verification_status,

            cc.contact_phone
              AS company_contact_phone,

            cc.contact_email
              AS company_contact_email

          FROM
            public.project_bids pb

          JOIN
            public.projects p
            ON p.id =
              pb.project_id

          JOIN
            public.contractor_companies cc
            ON cc.id =
              pb.contractor_id

          WHERE
            p.customer_id =
              $1

          ORDER BY
            pb.created_at DESC
        `,
        [
          userId,
        ]
      );

    return result.rows.map(
      (row) => ({
        id:
          row.id,

        project_id:
          row.project_id,

        contractor_id:
          row.contractor_id,

        price:
          Number(
            row.price
          ),

        duration_days:
          row.duration_days,

        message:
          row.message,

        proposed_start_date:
          toNullableDateString(
            row.proposed_start_date
          ),

        status:
          row.status,

        created_at:
          toIsoString(
            row.created_at
          ),

        updated_at:
          toIsoString(
            row.updated_at
          ),

        projects: {
          id:
            row.project_id,

          title:
            row.project_title,

          city:
            row.project_city,

          customer_id:
            row.project_customer_id,

          status:
            row.project_status,
        },

        contractor_companies: {
          id:
            row.contractor_id,

          public_name:
            row.company_public_name,

          legal_name:
            row.company_legal_name,

          company_type:
            row.company_type,

          rating:
            Number(
              row.company_rating
            ),

          rating_count:
            row.company_rating_count,

          verification_status:
            row.company_verification_status,

          contact_phone:
            row.company_contact_phone,

          contact_email:
            row.company_contact_email,
        },
      })
    );
  } catch (error) {
    console.error(
      "Ошибка загрузки предложений заказчика:",
      error
    );

    throw new Error(
      "Не удалось загрузить предложения"
    );
  }
}

function toNullableDateString(
  value:
    Date | string | null
) {
  if (!value) {
    return null;
  }

  return value instanceof Date
    ? value.toISOString()
    : String(value);
}

function toIsoString(
  value:
    Date | string
) {
  return value instanceof Date
    ? value.toISOString()
    : String(value);
}