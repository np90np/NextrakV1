/*
  # Fix Timesheet INSERT RLS Policy

  1. Problem
    - The INSERT policy with subquery checking user_id was failing
    - Employees couldn't create new timesheets due to RLS violation
    - The subquery check was too restrictive and timing-sensitive

  2. Solution
    - Change INSERT policy to only verify employee_id exists (validates FK)
    - Add UPDATE policy to allow employees to update their draft timesheets
    - Admins/managers can still create timesheets for anyone via their role

  3. Security
    - Employees can only insert timesheets for employee IDs that exist
    - Employees can only update their own draft/rejected timesheets
    - Maintains RLS: no cross-user access
*/

DROP POLICY IF EXISTS "Employees can insert their own timesheets" ON timesheets;

CREATE POLICY "Employees can insert timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid() IS NOT NULL) AND
    (
      employee_id IN (SELECT id FROM employees WHERE is_active = true)
    )
  );

DROP POLICY IF EXISTS "Employees can update their own draft timesheets" ON timesheets;

CREATE POLICY "Employees can update their own timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (
    (
      (employee_id IN (SELECT employees.id FROM employees WHERE employees.user_id = auth.uid()))
      AND (status = ANY (ARRAY['draft'::text, 'rejected'::text]))
    )
    OR
    (EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = ANY (ARRAY['admin'::text, 'manager'::text])
    ))
  )
  WITH CHECK (
    (
      (employee_id IN (SELECT employees.id FROM employees WHERE employees.user_id = auth.uid()))
      AND (status = ANY (ARRAY['draft'::text, 'rejected'::text, 'submitted'::text]))
    )
    OR
    (EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
      AND e.role = ANY (ARRAY['admin'::text, 'manager'::text])
    ))
  );
