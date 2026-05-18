/*
  # Add Supervisor Role

  1. Changes
    - Add 'supervisor' to the role check constraint on employees table
    - Supervisors can approve timesheets and view daily diary like managers

  2. Security
    - RLS policies already support 'manager' role, will extend to include 'supervisor'
*/

DO $$
BEGIN
  -- Update the check constraint to include 'supervisor' role
  ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
  ALTER TABLE employees ADD CONSTRAINT employees_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'supervisor'::text, 'employee'::text]));
EXCEPTION WHEN OTHERS THEN
  -- Constraint might not exist yet, that's ok
  NULL;
END $$;
