/*
  # Seed Timesheet with Cost Codes Demo
  
  Creates sample timesheet entries that show cost codes in the timesheet form.
  This demonstrates the new cost_code field on projects when selecting
  a project for a timesheet entry.
*/

INSERT INTO timesheets (employee_id, week_start_date, status, total_hours)
VALUES (
  (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au'),
  '2026-05-04',
  'draft',
  16
)
ON CONFLICT DO NOTHING;

INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description)
SELECT
  ts.id,
  p.id,
  '2026-05-04',
  8,
  'ordinary',
  'Site preparation and planning'
FROM timesheets ts, projects p
WHERE ts.week_start_date = '2026-05-04'
  AND p.name = 'Riverside Shopping Centre'
  AND ts.employee_id = (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au')
  AND NOT EXISTS (
    SELECT 1 FROM timesheet_entries te
    WHERE te.timesheet_id = ts.id AND te.work_date = '2026-05-04'
  )
ON CONFLICT DO NOTHING;

INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description)
SELECT
  ts.id,
  p.id,
  '2026-05-05',
  8,
  'ordinary',
  'Concrete foundation work'
FROM timesheets ts, projects p
WHERE ts.week_start_date = '2026-05-04'
  AND p.name = 'Eastside Residential Estate'
  AND ts.employee_id = (SELECT id FROM employees WHERE email = 'tom@buildtrack.com.au')
  AND NOT EXISTS (
    SELECT 1 FROM timesheet_entries te
    WHERE te.timesheet_id = ts.id AND te.work_date = '2026-05-05'
  )
ON CONFLICT DO NOTHING;
