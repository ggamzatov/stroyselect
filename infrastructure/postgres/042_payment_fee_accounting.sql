BEGIN;

ALTER TABLE public.project_payment_intents
  ADD COLUMN IF NOT EXISTS payout_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(14,2);

UPDATE public.project_payment_intents
SET payout_amount=COALESCE(payout_amount,amount),
    platform_fee_amount=COALESCE(platform_fee_amount,0)
WHERE payout_amount IS NULL OR platform_fee_amount IS NULL;

ALTER TABLE public.project_payment_intents
  ADD CONSTRAINT project_payment_intents_payout_amount_check
  CHECK (payout_amount IS NULL OR (payout_amount > 0 AND payout_amount <= amount)) NOT VALID;

ALTER TABLE public.project_payment_intents
  ADD CONSTRAINT project_payment_intents_platform_fee_check
  CHECK (platform_fee_amount IS NULL OR platform_fee_amount >= 0) NOT VALID;

ALTER TABLE public.project_payment_intents VALIDATE CONSTRAINT project_payment_intents_payout_amount_check;
ALTER TABLE public.project_payment_intents VALIDATE CONSTRAINT project_payment_intents_platform_fee_check;

COMMIT;
