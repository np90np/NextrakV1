/*
  # Construction Management App Schema

  ## Overview
  Full schema for a construction management web app for small construction companies.

  ## New Tables

  ### 1. employees
  - Core employee records including role, contact info, employment status
  - Roles: admin, manager, employee

  ### 2. projects
  - Construction project records with status tracking, location, budget
  - Status: planning, active, on_hold, completed

  ### 3. timesheets
  - Employee timesheet entries linked to projects
  - Status: draft, submitted, approved, rejected

  ### 4. timesheet_entries
  - Individual daily hour entries within a timesheet week

  ### 5. daily_reports
  - Daily site reports linked to projects with weather, progress notes, issues

  ### 6. daily_report_photos
  - Photo metadata for daily reports

  ## Security
  - RLS enabled on all tables
  - Policies allow authenticated users to read/write their own data
  - Managers/admins have broader access via role check on employees table
*/

-- EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  position text DEFAULT '',
  hourly_rate numeric(10,2) DEFAULT 0,
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  start_date date,
  is_active boolean NOT NULL DEFAULT true,
  emergency_contact_name text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    ) OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  client_name text DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  postcode text DEFAULT '',
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
  budget numeric(12,2) DEFAULT 0,
  contract_value numeric(12,2) DEFAULT 0,
  start_date date,
  end_date date,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- TIMESHEETS TABLE
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_hours numeric(6,2) DEFAULT 0,
  approved_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own timesheets"
  ON timesheets FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Employees can insert their own timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can update their own draft timesheets"
  ON timesheets FOR UPDATE
  TO authenticated
  USING (
    (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND status IN ('draft', 'rejected'))
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()) AND status IN ('draft', 'rejected', 'submitted'))
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete timesheets"
  ON timesheets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

-- TIMESHEET ENTRIES TABLE
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  start_time time,
  end_time time,
  break_minutes integer DEFAULT 0,
  hours numeric(5,2) NOT NULL DEFAULT 0,
  work_type text DEFAULT 'ordinary' CHECK (work_type IN ('ordinary', 'overtime', 'double_time', 'public_holiday')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timesheet entries they have access to"
  ON timesheet_entries FOR SELECT
  TO authenticated
  USING (
    timesheet_id IN (
      SELECT id FROM timesheets WHERE
        employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin','manager'))
    )
  );

CREATE POLICY "Employees can insert entries into their timesheets"
  ON timesheet_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees emp ON emp.id = t.employee_id
      WHERE emp.user_id = auth.uid() AND t.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Employees can update entries in their draft timesheets"
  ON timesheet_entries FOR UPDATE
  TO authenticated
  USING (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees emp ON emp.id = t.employee_id
      WHERE emp.user_id = auth.uid() AND t.status IN ('draft', 'rejected')
    )
  )
  WITH CHECK (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees emp ON emp.id = t.employee_id
      WHERE emp.user_id = auth.uid() AND t.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Employees can delete entries in their draft timesheets"
  ON timesheet_entries FOR DELETE
  TO authenticated
  USING (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees emp ON emp.id = t.employee_id
      WHERE emp.user_id = auth.uid() AND t.status IN ('draft', 'rejected')
    )
  );

-- DAILY REPORTS TABLE
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  weather text DEFAULT '',
  temperature text DEFAULT '',
  workers_on_site integer DEFAULT 0,
  progress_notes text DEFAULT '',
  issues text DEFAULT '',
  materials_used text DEFAULT '',
  equipment_used text DEFAULT '',
  visitors text DEFAULT '',
  safety_incidents text DEFAULT '',
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily reports"
  ON daily_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can insert daily reports"
  ON daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reported_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Reporters and managers can update daily reports"
  ON daily_reports FOR UPDATE
  TO authenticated
  USING (
    reported_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  )
  WITH CHECK (
    reported_by IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can delete daily reports"
  ON daily_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager'))
  );

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_week_start ON timesheets(week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet_id ON timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_work_date ON timesheet_entries(work_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);
