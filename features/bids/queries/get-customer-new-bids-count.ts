import { createClient } from "@/lib/supabase/server";

export type CustomerBidsCounts = {
  newBidsCount: number;
  acceptedBidsCount: number;
};

export async function getCustomerBidsCounts(): Promise<CustomerBidsCounts> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      newBidsCount: 0,
      acceptedBidsCount: 0,
    };
  }

  const baseSelect = `
    id,
    projects!project_bids_project_id_fkey!inner (
      customer_id
    )
  `;

  const [
    { count: newBidsCount, error: newBidsError },
    { count: acceptedBidsCount, error: acceptedBidsError },
  ] = await Promise.all([
    supabase
      .from("project_bids")
      .select(baseSelect, {
        count: "exact",
        head: true,
      })
      .eq("projects.customer_id", user.id)
      .eq("status", "submitted"),

    supabase
      .from("project_bids")
      .select(baseSelect, {
        count: "exact",
        head: true,
      })
      .eq("projects.customer_id", user.id)
      .eq("status", "accepted"),
  ]);

  if (newBidsError) {
    console.error(
      "Ошибка подсчёта новых предложений:",
      {
        message: newBidsError.message,
        code: newBidsError.code,
        details: newBidsError.details,
        hint: newBidsError.hint,
      }
    );
  }

  if (acceptedBidsError) {
    console.error(
      "Ошибка подсчёта принятых предложений:",
      {
        message: acceptedBidsError.message,
        code: acceptedBidsError.code,
        details: acceptedBidsError.details,
        hint: acceptedBidsError.hint,
      }
    );
  }

  return {
    newBidsCount:
      newBidsError ? 0 : newBidsCount ?? 0,

    acceptedBidsCount:
      acceptedBidsError
        ? 0
        : acceptedBidsCount ?? 0,
  };
}