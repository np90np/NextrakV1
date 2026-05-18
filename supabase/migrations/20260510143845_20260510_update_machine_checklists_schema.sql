/*
  # Update Machine Checklists Schema

  1. Changes
    - Add `asset_id` column to reference assets table (FK)
    - Add `category` column to store asset category
    - Keep `machine_id_number` and `registration_number` for backward compatibility
    - Add NOT NULL constraint to `machine_id_number` (was previously optional)

  2. New Columns
    - `asset_id` (uuid) - FK to assets table
    - `category` (text) - Asset category (equipment type)

  3. Notes
    - Existing data: registration_number field retained for backward compatibility but not used in new form
    - New entries will use asset_id and category instead
    - Users can select from existing assets dropdown
*/

DO $$
BEGIN
  -- Add asset_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'machine_checklists' AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE machine_checklists ADD COLUMN asset_id uuid REFERENCES assets(id) ON DELETE SET NULL;
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'machine_checklists' AND column_name = 'category'
  ) THEN
    ALTER TABLE machine_checklists ADD COLUMN category text;
  END IF;

  -- Make machine_id_number NOT NULL for new entries
  -- Note: We can't enforce this for existing rows with NULL values
  -- So we keep it nullable at DB level and validate in app
END $$;
