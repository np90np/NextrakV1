-- Add receipt attachment key to daily expenses for Cloudflare R2 uploads.
ALTER TABLE daily_expenses
ADD COLUMN IF NOT EXISTS receipt_key text DEFAULT '';
