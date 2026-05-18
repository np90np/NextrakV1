/*
  # Re-seed Employee Records and Associated Data

  ## Overview
  Re-inserts employee records linked to the properly created auth users,
  updates project manager references, and re-seeds timesheets, daily reports,
  and expenses.

  ## Changes
  1. Insert 6 employee records linked to auth users via user_id
  2. Update project manager_id references
  3. Insert 4 timesheets with entries
  4. Insert 3 daily reports with 5 expenses

  ## Auth Users (created via admin API)
  - admin@buildtrack.com.au (a2c2ea2d-b816-4df0-8536-c3e3e7b6ffa1)
  - sarah@buildtrack.com.au (852b0bd8-48cf-4104-a978-6d27d81a7f73)
  - tom@buildtrack.com.au (49fdbb6f-6a55-49a0-bc9e-190421d6b2e6)
  - jake@buildtrack.com.au (1e50adde-5d43-4bdd-9558-fd24795e6898)
  - ryan@buildtrack.com.au (e3e4f0a0-3081-4a83-8ed4-97588abaa0d6)
  - emma@buildtrack.com.au (f9f9458c-cb87-46e3-b47f-6cc35a0e4865)
*/

-- Insert employee records linked to auth users
INSERT INTO employees (user_id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone)
SELECT
  u.id,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 'Mike'
    WHEN 'sarah@buildtrack.com.au' THEN 'Sarah'
    WHEN 'tom@buildtrack.com.au' THEN 'Tom'
    WHEN 'jake@buildtrack.com.au' THEN 'Jake'
    WHEN 'ryan@buildtrack.com.au' THEN 'Ryan'
    WHEN 'emma@buildtrack.com.au' THEN 'Emma'
  END,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 'Johnson'
    WHEN 'sarah@buildtrack.com.au' THEN 'Williams'
    WHEN 'tom@buildtrack.com.au' THEN 'Brown'
    WHEN 'jake@buildtrack.com.au' THEN 'Davis'
    WHEN 'ryan@buildtrack.com.au' THEN 'Chen'
    WHEN 'emma@buildtrack.com.au' THEN 'Wilson'
  END,
  u.email,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN '0400 111 222'
    WHEN 'sarah@buildtrack.com.au' THEN '0401 222 333'
    WHEN 'tom@buildtrack.com.au' THEN '0402 333 444'
    WHEN 'jake@buildtrack.com.au' THEN '0403 444 555'
    WHEN 'ryan@buildtrack.com.au' THEN '0404 555 666'
    WHEN 'emma@buildtrack.com.au' THEN '0405 666 777'
  END,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 'admin'
    WHEN 'sarah@buildtrack.com.au' THEN 'manager'
    ELSE 'employee'
  END,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 'Owner'
    WHEN 'sarah@buildtrack.com.au' THEN 'Project Manager'
    WHEN 'tom@buildtrack.com.au' THEN 'Foreman'
    WHEN 'jake@buildtrack.com.au' THEN 'Labourer'
    WHEN 'ryan@buildtrack.com.au' THEN 'Carpenter'
    WHEN 'emma@buildtrack.com.au' THEN 'Plant Operator'
  END,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 55.00
    WHEN 'sarah@buildtrack.com.au' THEN 50.00
    WHEN 'tom@buildtrack.com.au' THEN 42.00
    WHEN 'jake@buildtrack.com.au' THEN 35.00
    WHEN 'ryan@buildtrack.com.au' THEN 45.00
    WHEN 'emma@buildtrack.com.au' THEN 48.00
  END,
  'full_time',
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN '2020-01-15'
    WHEN 'sarah@buildtrack.com.au' THEN '2021-03-01'
    WHEN 'tom@buildtrack.com.au' THEN '2022-06-15'
    WHEN 'jake@buildtrack.com.au' THEN '2023-09-01'
    WHEN 'ryan@buildtrack.com.au' THEN '2022-02-01'
    WHEN 'emma@buildtrack.com.au' THEN '2023-01-10'
  END::date,
  true,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN 'Linda Johnson'
    WHEN 'sarah@buildtrack.com.au' THEN 'Mark Williams'
    WHEN 'tom@buildtrack.com.au' THEN 'Lisa Brown'
    WHEN 'jake@buildtrack.com.au' THEN 'Bob Davis'
    WHEN 'ryan@buildtrack.com.au' THEN 'Wei Chen'
    WHEN 'emma@buildtrack.com.au' THEN 'James Wilson'
  END,
  CASE u.email
    WHEN 'admin@buildtrack.com.au' THEN '0400 999 888'
    WHEN 'sarah@buildtrack.com.au' THEN '0401 888 777'
    WHEN 'tom@buildtrack.com.au' THEN '0402 777 666'
    WHEN 'jake@buildtrack.com.au' THEN '0403 666 555'
    WHEN 'ryan@buildtrack.com.au' THEN '0404 555 444'
    WHEN 'emma@buildtrack.com.au' THEN '0405 444 333'
  END
FROM auth.users u
WHERE u.email IN (
  'admin@buildtrack.com.au',
  'sarah@buildtrack.com.au',
  'tom@buildtrack.com.au',
  'jake@buildtrack.com.au',
  'ryan@buildtrack.com.au',
  'emma@buildtrack.com.au'
);

-- Update project manager references
UPDATE projects SET manager_id = (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au')
WHERE name IN ('Riverside Shopping Centre', 'Eastside Residential Estate');

UPDATE projects SET manager_id = (SELECT id FROM employees WHERE email = 'admin@buildtrack.com.au')
WHERE name = 'City Tower Office Complex';

-- Insert timesheets
INSERT INTO timesheets (employee_id, week_start_date, status, total_hours, approved_by, approved_at, notes)
VALUES
  (
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-04-27', 'submitted', 38.00, NULL, NULL,
    'Regular week, some overtime on Thursday'
  ),
  (
    (SELECT id FROM employees WHERE email = 'jake@buildtrack.com.au'),
    '2026-04-27', 'approved', 40.00,
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-02 09:15:00+00',
    'Full week including Saturday morning'
  ),
  (
    (SELECT id FROM employees WHERE email = 'ryan@buildtrack.com.au'),
    '2026-04-27', 'draft', 36.00, NULL, NULL, ''
  ),
  (
    (SELECT id FROM employees WHERE email = 'emma@buildtrack.com.au'),
    '2026-04-27', 'submitted', 38.00, NULL, NULL,
    'Excavator work on Riverside site'
  );

-- Insert timesheet entries for Tom Brown
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

-- Insert timesheet entries for Jake Davis
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

-- Insert timesheet entries for Ryan Chen
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

-- Insert timesheet entries for Emma Wilson
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
    '2026-05-01', 'Partly cloudy', '18C', 12,
    'Level 2 slab pour completed. Formwork stripped and cleaned. Wall framing commenced on ground floor retail units.',
    'Minor delay due to concrete truck scheduling - 45 min wait at 10am.',
    '40m3 concrete, formwork timber, tie wire',
    'Concrete pump, crane, vibrator',
    'Client representative - John from Riverside Dev',
    'None', true
  ),
  (
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01', 'Sunny', '20C', 8,
    'Water main installation completed for Stage 1. Sewer connections progressing well on Lots 1-6. Stormwater pit construction started.',
    'Existing services clash at Lot 3 - need design review before proceeding.',
    'PVC pipe 150mm, fittings, concrete for thrust blocks',
    'Excavator, roller, tip truck',
    'Council inspector - drainage check',
    'None', true
  ),
  (
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-02', 'Overcast, light rain afternoon', '16C', 10,
    'Wall framing continued. Ground floor retail units 1-4 framed. Started first floor office partition framing.',
    'Rain stopped outdoor work at 2pm. Covered exposed areas with tarps.',
    'Timber framing, nails, brackets',
    'Nail gun, saw, crane',
    'None', 'None', false
  );

-- Insert daily expenses
INSERT INTO daily_expenses (daily_report_id, project_id, recorded_by, expense_date, category, description, amount, receipt_number, supplier, is_billable)
VALUES
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-01', 'materials', 'Concrete - 40m3 GP32', 2400.00, 'INV-2026-0501', 'Boral Concrete Newcastle', true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-01', 'fuel', 'Diesel - site equipment refuel', 385.00, 'INV-2026-0502', 'Caltex Mayfield', true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Eastside Residential Estate')),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01', 'materials', 'PVC pipe and fittings - 150mm stormwater', 890.00, 'INV-2026-0503', 'Reece Civil Newcastle', true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-01' AND project_id = (SELECT id FROM projects WHERE name = 'Eastside Residential Estate')),
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au'),
    '2026-05-01', 'hire', 'Excavator hire - 8 tonne (1 day)', 550.00, 'HIRE-2026-0427', 'Coates Hire Newcastle', true
  ),
  (
    (SELECT id FROM daily_reports WHERE report_date = '2026-05-02' AND project_id = (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre')),
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
    '2026-05-02', 'materials', 'Timber framing - MGP10 pine', 1250.00, 'INV-2026-0504', 'Mitre 10 Newcastle', true
  );
