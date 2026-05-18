/*
  # Seed Mock Data: Auth Users, Employees, and Projects

  ## Overview
  Creates 6 mock auth users with known passwords and corresponding employee records,
  plus 3 sample projects for testing the BuildTrack construction management app.

  ## Auth Users Created
  All users have password: `BuildTrack2026!`

  1. admin@buildtrack.com.au - Mike Johnson (Admin/Owner)
  2. sarah@buildtrack.com.au - Sarah Williams (Manager/Project Manager)
  3. tom@buildtrack.com.au - Tom Brown (Employee/Foreman)
  4. jake@buildtrack.com.au - Jake Davis (Employee/Labourer)
  5. ryan@buildtrack.com.au - Ryan Chen (Employee/Carpenter)
  6. emma@buildtrack.com.au - Emma Wilson (Employee/Plant Operator)

  ## Employee Records
  - Each auth user gets a corresponding employee record with realistic data
  - Roles: 1 admin, 1 manager, 4 employees
  - Hourly rates: $35-$55/hr depending on role and position
  - All marked as active, full-time employees

  ## Projects Created
  1. Riverside Shopping Centre - Active, $2.5M
  2. Eastside Residential Estate - Active, $1.8M
  3. City Tower Office Complex - Planning, $4.2M

  ## Security Notes
  1. Auth users created with crypt() password hashing via pgcrypto
  2. Email confirmation is bypassed (email_confirmed_at set at creation)
  3. Employee records link to auth users via user_id foreign key
  4. All existing RLS policies remain in effect
*/

-- Create auth users with known passwords
-- Password for all users: BuildTrack2026!

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  phone, created_at, updated_at, confirmation_token, email_change,
  phone_change, raw_app_meta_data, raw_user_meta_data,
  is_sso_user, deleted_at, banned_until, reauthentication_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Mike Johnson"}',
    false, null, null, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'sarah@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Sarah Williams"}',
    false, null, null, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'tom@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Tom Brown"}',
    false, null, null, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jake@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Jake Davis"}',
    false, null, null, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ryan@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Ryan Chen"}',
    false, null, null, ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'emma@buildtrack.com.au',
    crypt('BuildTrack2026!', gen_salt('bf')),
    now(),
    NULL,
    now(), now(),
    '', '', '',
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Emma Wilson"}',
    false, null, null, ''
  );

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

-- Insert sample projects
INSERT INTO projects (name, description, client_name, client_email, client_phone, address, city, state, postcode, status, budget, contract_value, start_date, end_date, manager_id)
VALUES
  (
    'Riverside Shopping Centre',
    'New shopping centre construction with 24 retail units, food court, and underground parking',
    'Riverside Developments Pty Ltd',
    'john@riversidedev.com.au',
    '02 5555 1234',
    '45 River Road',
    'Newcastle',
    'NSW',
    '2300',
    'active',
    2500000.00,
    2800000.00,
    '2025-09-01',
    '2026-06-30',
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au')
  ),
  (
    'Eastside Residential Estate',
    'Residential subdivision with 38 lots, roads, and infrastructure including water/sewer connections',
    'Eastside Homes Ltd',
    'info@eastsidehomes.com.au',
    '02 5555 5678',
    '120 Eastern Parade',
    'Maitland',
    'NSW',
    '2320',
    'active',
    1800000.00,
    2100000.00,
    '2025-11-15',
    '2026-09-30',
    (SELECT id FROM employees WHERE email = 'sarah@buildtrack.com.au')
  ),
  (
    'City Tower Office Complex',
    '12-storey commercial office building with basement parking and ground-floor retail',
    'City Tower Investments',
    'projects@citytower.com.au',
    '02 5555 9012',
    '88 Hunter Street',
    'Newcastle',
    'NSW',
    '2300',
    'planning',
    4200000.00,
    4800000.00,
    '2026-07-01',
    '2027-12-31',
    (SELECT id FROM employees WHERE email = 'admin@buildtrack.com.au')
  );
