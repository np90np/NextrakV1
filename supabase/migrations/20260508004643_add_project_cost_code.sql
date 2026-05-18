/*
  # Add Project Cost Code

  1. New Fields
    - `cost_code` (text) - Unique project cost code for accounting/billing purposes
  
  2. Changes
    - Added `cost_code` column to `projects` table
    - Can be used for grouping hours by cost code in timesheets
  
  3. Security
    - RLS policies already cover this field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'cost_code'
  ) THEN
    ALTER TABLE projects ADD COLUMN cost_code text DEFAULT '';
  END IF;
END $$;
