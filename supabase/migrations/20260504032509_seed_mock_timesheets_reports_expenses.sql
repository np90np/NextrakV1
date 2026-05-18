/*
  # Seed Mock Data: Timesheets, Entries, Daily Reports, and Expenses

  ## Overview
  Seeds realistic timesheet, daily report, and expense data for the mock employees
  and projects created in the previous migration.

  ## Data Created

  ### Timesheets (4 records)
  1. Tom Brown - week of 2026-04-27, submitted, 38 hours
  2. Jake Davis - week of 2026-04-27, approved, 40 hours
  3. Ryan Chen - week of 2026-04-27, draft, 36 hours
  4. Emma Wilson - week of 2026-04-27, submitted, 38 hours

  ### Timesheet Entries (16 records)
  - 4 entries per employee across Mon-Thu of the week
  - Mix of ordinary and overtime hours
  - Linked to Riverside Shopping Centre and Eastside Residential Estate projects

  ### Daily Reports (3 records)
  1. Riverside Shopping Centre - 2026-05-01, by Tom Brown
  2. Eastside Residential Estate - 2026-05-01, by Sarah Williams
  3. Riverside Shopping Centre - 2026-05-02, by Tom Brown

  ### Daily Expenses (5 records)
  - Materials, fuel, and hire expenses across the daily reports
  - Amounts ranging from $85 to $2,400

  ## Security Notes
  1. All records reference valid employee and project IDs from previous migration
  2. RLS policies on all tables remain in effect
  3. Timesheet entries reference correct timesheet and project IDs
*/

-- Insert timesheets for the week of April 27, 2026
INSERT INTO timesheets (employee_id, week_start_date, status, total_hours, approved_by, approved_at, notes)
VALUES
  (
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-04-27',
    'submitted',
    38.00,
    NULL,
    NULL,
    'Regular week, some overtime on Thursday'
  ),
  (
    (SELECT id FROM employees WHERE email = 'jake@buildtrack.com.au'),
    '2026-04-27',
    'approved',
    40.00,
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-02 09:15:00+00',
    'Full week including Saturday morning'
  ),
  (
    (SELECT id FROM employees WHERE email = 'ryan@buildtrack.com.au'),
    '2026-04-27',
    'draft',
    36.00,
    NULL,
    NULL,
    ''
  ),
  (
    (SELECT id FROM employees WHERE email = 'emma@buildtrack.com.au'),
    '2026-04-27',
    'submitted',
    38.00,
    NULL,
    NULL,
    'Excavator work on Riverside site'
  );

-- Insert timesheet entries for Tom Brown (Mon-Thu)
INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, start_time, end_time, break_minutes, hours, work_type, description)
VALUES
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'tom@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-27', '07:00', '15:30', 30, 8.0, 'ordinary', 'Formwork setup - Level 2 slab'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'tom@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-28', '07:00', '15:30', 30, 8.0, 'ordinary', 'Concrete pour - Level 2'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'tom@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-29', '07:00', '15:30', 30, 8.0, 'ordinary', 'Site prep - Lot 12-15'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'tom@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-30', '07:00', '17:30', 30, 10.0, 'overtime', 'Finishing works - overtime for slab cure'
  );

-- Insert timesheet entries for Jake Davis (Mon-Thu + Sat)
INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, start_time, end_time, break_minutes, hours, work_type, description)
VALUES
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'jake@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-27', '06:30', '15:00', 30, 8.0, 'ordinary', 'Trenching - water main installation'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'jake@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-28', '06:30', '15:00', 30, 8.0, 'ordinary', 'Sewer line connection - Lots 1-6'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'jake@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-29', '06:30', '15:00', 30, 8.0, 'ordinary', 'Backfill and compaction'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'jake@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-30', '06:30', '15:00', 30, 8.0, 'ordinary', 'Stormwater drainage - Stage 1'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'jake@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-05-02', '07:00', '12:00', 0, 5.0, 'overtime', 'Saturday - finish stormwater pits'
  );

-- Insert timesheet entries for Ryan Chen (Mon-Wed)
INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, start_time, end_time, break_minutes, hours, work_type, description)
VALUES
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'ryan@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-27', '07:00', '15:30', 30, 8.0, 'ordinary', 'Wall framing - Ground floor retail'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'ryan@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-28', '07:00', '15:30', 30, 8.0, 'ordinary', 'Wall framing - First floor offices'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'ryan@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-29', '07:00', '15:30', 30, 8.0, 'ordinary', 'Door frame installation - Display homes'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'ryan@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-30', '07:00', '15:30', 30, 8.0, 'ordinary', 'Roof truss installation prep'
  );

-- Insert timesheet entries for Emma Wilson (Mon-Thu)
INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, start_time, end_time, break_minutes, hours, work_type, description)
VALUES
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'emma@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-27', '06:00', '14:30', 30, 8.0, 'ordinary', 'Excavation - basement car park area B'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'emma@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-28', '06:00', '14:30', 30, 8.0, 'ordinary', 'Excavation - basement car park area C'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'emma@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    '2026-04-29', '06:00', '14:30', 30, 8.0, 'ordinary', 'Site levelling - Stage 2 lots'
  ),
  (
    (SELECT t.id FROM timesheets t JOIN employees e ON e.id = t.employee_id WHERE e.email = 'emma@buildtrack.com.au' AND t.week_start_date = '2026-04-27'),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    '2026-04-30', '06:00', '16:30', 30, 10.0, 'overtime', 'Overtime - finish basement excavation'
  );

-- Insert daily reports
INSERT INTO daily_reports (project_id, reported_by, report_date, weather, temperature, workers_on_site, progress_notes, issues, materials_used, equipment_used, visitors, safety_incidents, is_complete)
VALUES
  (
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-01',
    'Partly cloudy',
    '18°C',
    12,
    'Level 2 slab pour completed. Formwork stripped and cleaned. Wall framing commenced on ground floor retail units.',
    'Minor delay due to concrete truck scheduling - 45 min wait at 10am.',
    '40m3 concrete, formwork timber, tie wire',
    'Concrete pump, crane, vibrator',
    'Client representative - John from Riverside Dev',
    'None',
    true
  ),
  (
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01',
    'Sunny',
    '20°C',
    8,
    'Water main installation completed for Stage 1. Sewer connections progressing well on Lots 1-6. Stormwater pit construction started.',
    'Existing services clash at Lot 3 - need design review before proceeding.',
    'PVC pipe 150mm, fittings, concrete for thrust blocks',
    'Excavator, roller, tip truck',
    'Council inspector - drainage check',
    'None',
    true
  ),
  (
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-02',
    'Overcast, light rain afternoon',
    '16°C',
    10,
    'Wall framing continued. Ground floor retail units 1-4 framed. Started first floor office partition framing.',
    'Rain stopped outdoor work at 2pm. Covered exposed areas with tarps.',
    'Timber framing, nails, brackets',
    'Nail gun, saw, crane',
    'None',
    'None',
    false
  );

-- Insert daily expenses
INSERT INTO daily_expenses (daily_report_id, project_id, recorded_by, expense_date, category, description, amount, receipt_number, supplier, is_billable)
VALUES
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-01',
    'materials',
    'Concrete - 40m3 GP32',
    2400.00,
    'INV-2026-0501',
    'Boral Concrete Newcastle',
    true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-01',
    'fuel',
    'Diesel - site equipment refuel',
    385.00,
    'INV-2026-0502',
    'Caltex Mayfield',
    true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Eastside Residential Estate')),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01',
    'materials',
    'PVC pipe and fittings - 150mm stormwater',
    890.00,
    'INV-2026-0503',
    'Reece Civil Newcastle',
    true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Eastside Residential Estate')),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01',
    'hire',
    'Excavator hire - 8 tonne (1 day)',
    550.00,
    'HIRE-2026-0427',
    'Coates Hire Newcastle',
    true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-02' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-02',
    'materials',
    'Timber framing - MGP10 pine',
    1250.00,
    'INV-2026-0504',
    'Mitre 10 Newcastle',
    true
  );
