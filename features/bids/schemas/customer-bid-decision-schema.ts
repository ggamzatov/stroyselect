import { z } from "zod";

export const customerBidDecisionSchema = z.object({
  bidId: z.string().uuid(),

  decision: z.enum([
    "viewed",
    "shortlisted",
    "accepted",
    "rejected",
  ]),
});

export type CustomerBidDecisionInput =
  z.infer<typeof customerBidDecisionSchema>;