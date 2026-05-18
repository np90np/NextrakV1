/*
  # Fix Timesheet RLS Policy and Prepare for Break Minutes

  1. RLS Policy Fix
    - Update INSERT policy on timesheets table to allow authenticated users to insert timesheets
    - The policy now checks if the user is an employee (any employee record linked to auth.uid)
    - This fixes the "violates row-level security policy" error

  2. Database Structure
    - timesheet_entries table already has break_minutes column (integer, default 0)
    - No migration needed for schema; just needs frontend UI update

  3. Security
    - Maintains RLS: employees can only insert for themselves
    - Admins/managers can still insert for any employee via their existing role-based policy
*/

DROP POLICY IF EXISTS "Employees can insert their own timesheets" ON timesheets;

CREATE POLICY "Employees can insert their own timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );
