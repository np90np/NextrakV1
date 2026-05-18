/*
  # Machine Prestart Checklists and Daily Expenses

  ## Overview
  Adds machine prestart safety checklists and daily expense tracking
  for the construction management app.

  ## New Tables

  ### 1. machine_checklists
  - Pre-start safety inspection checklists for plant/machinery
  - Linked to projects and employees (inspector)
  - Contains structured checklist items as JSONB
  - Status: draft, submitted, flagged

  ### 2. daily_expenses
  - Expense records linked to daily reports
  - Categories: materials, fuel, hire, subcontractor, other
  - Includes receipt number, amount, and description

  ## Security
  - RLS enabled on all tables
  - Employees can create/update their own records
  - Managers/admins have broader access
*/

-- MACHINE CHECKLISTS TABLE
CREATE TABLE IF NOT EXISTS machine_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspected_by uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  inspection_date date NOT NULL,
  machine_name text NOT NULL DEFAULT '',
  machine_id_number text DEFAULT '',
  registration_number text DEFAULT '',
  hours_reading numeric(10,1) DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'flagged')),
  items jsonb NOT NULL DEFAULT '[]',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE machine_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view machine checklists"
  ON machine_checklists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert machine checklists"
  ON machine_checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    inspected_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Inspectors and managers can update machine checklists"
  ON machine_checklists FOR UPDATE
  TO authenticated
  USING (
    inspected_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    inspected_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can delete machine checklists"
  ON machine_checklists FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

-- DAILY EXPENSES TABLE
CREATE TABLE IF NOT EXISTS daily_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid REFERENCES daily_reports(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recorded_by uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('materials', 'fuel', 'hire', 'subcontractor', 'other')),
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  receipt_number text DEFAULT '',
  supplier text DEFAULT '',
  is_billable boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily expenses"
  ON daily_expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert daily expenses"
  ON daily_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    recorded_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Recorders and managers can update daily expenses"
  ON daily_expenses FOR UPDATE
  TO authenticated
  USING (
    recorded_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    recorded_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can delete daily expenses"
  ON daily_expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_machine_checklists_project_id ON machine_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_machine_checklists_inspection_date ON machine_checklists(inspection_date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_project_id ON daily_expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_expense_date ON daily_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_daily_report_id ON daily_expenses(daily_report_id);
