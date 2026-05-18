/*
  # Create Assets Table

  ## Overview
  Adds an asset management table for tracking construction plant, equipment,
  and vehicles owned or hired by the company.

  ## New Table

  ### assets
  - `id` (uuid, primary key)
  - `name` (text) - Asset name/description
  - `asset_type` (text) - Category: plant, vehicle, equipment, tool
  - `serial_number` (text) - Manufacturer serial number
  - `registration` (text) - Vehicle/machine registration number
  - `purchase_date` (date) - When the asset was acquired
  - `purchase_price` (numeric) - Original purchase cost
  - `current_value` (numeric) - Current book value
  - `condition` (text) - Condition rating: new, good, fair, poor, decommissioned
  - `status` (text) - Availability: available, in_use, maintenance, retired
  - `assigned_project_id` (uuid, FK) - Currently assigned project
  - `assigned_employee_id` (uuid, FK) - Employee responsible for the asset
  - `location` (text) - Current physical location
  - `last_service_date` (date) - Last maintenance/service date
  - `next_service_date` (date) - Next scheduled service
  - `notes` (text) - Additional notes
  - `created_at`, `updated_at` (timestamps)

  ## Security
  - RLS enabled on assets table
  - All authenticated users can view assets
  - Only admins and managers can create, update, or delete assets
*/

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  asset_type text NOT NULL DEFAULT 'equipment' CHECK (asset_type IN ('plant', 'vehicle', 'equipment', 'tool')),
  serial_number text DEFAULT '',
  registration text DEFAULT '',
  purchase_date date,
  purchase_price numeric(12,2) DEFAULT 0,
  current_value numeric(12,2) DEFAULT 0,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('new', 'good', 'fair', 'poor', 'decommissioned')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
  assigned_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assigned_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  location text DEFAULT '',
  last_service_date date,
  next_service_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assets"
  ON assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert assets"
  ON assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update assets"
  ON assets FOR UPDATE
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

CREATE POLICY "Admins can delete assets"
  ON assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_project ON assets(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_employee ON assets(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_next_service ON assets(next_service_date);

-- Seed sample assets
INSERT INTO assets (name, asset_type, serial_number, registration, purchase_date, purchase_price, current_value, condition, status, assigned_project_id, assigned_employee_id, location, last_service_date, next_service_date, notes)
VALUES
  (
    'CAT 320 Excavator', 'plant', 'CAT320-2023-4521', 'NSW-EXC-001',
    '2023-03-15', 285000.00, 220000.00, 'good', 'in_use',
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    (SELECT id FROM employees WHERE email = 'emma@buildtrack.com.au'),
    'Riverside site - Basement area',
    '2026-03-01', '2026-06-01',
    '20 tonne excavator with GP bucket and mud bucket'
  ),
  (
    'Komatsu D65 Bulldozer', 'plant', 'KOM-D65-2022-8832', 'NSW-BD-002',
    '2022-08-20', 195000.00, 140000.00, 'good', 'in_use',
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    (SELECT id FROM employees WHERE email = 'emma@buildtrack.com.au'),
    'Eastside site - Stage 2',
    '2026-02-15', '2026-05-15',
    'Track type bulldozer for bulk earthworks'
  ),
  (
    'Toyota Hilux SR5', 'vehicle', 'TOY-HIL-2024-11234', 'ABC-123',
    '2024-01-10', 62000.00, 52000.00, 'good', 'available',
    NULL, NULL,
    'Depot - Newcastle',
    '2026-04-01', '2026-07-01',
    'Site ute - dual cab'
  ),
  (
    'Isuzu NPR Tip Truck', 'vehicle', 'ISU-NPR-2021-5567', 'XYZ-456',
    '2021-06-01', 88000.00, 55000.00, 'fair', 'in_use',
    (SELECT id FROM projects WHERE name = 'Eastside Residential Estate'),
    NULL,
    'Eastside site',
    '2026-01-15', '2026-04-15',
    '8 tonne tip truck - service overdue'
  ),
  (
    'Liebherr 130EC-H Tower Crane', 'plant', 'LIE-130-2024-9901', 'NSW-CR-005',
    '2024-06-01', 450000.00, 400000.00, 'new', 'in_use',
    (SELECT id FROM projects WHERE name = 'Riverside Shopping Centre'),
    NULL,
    'Riverside site - Erected at tower A',
    '2026-04-01', '2026-07-01',
    '10 tonne capacity tower crane'
  ),
  (
    'Makita Rotary Hammer Drill', 'tool', 'MAK-HR-2025-3321', '',
    '2025-02-15', 850.00, 700.00, 'new', 'available',
    NULL, NULL,
    'Depot - Tool store',
    NULL, NULL,
    'SDS+ rotary hammer with 3 chisel bits and 5 drill bits'
  ),
  (
    'Wacker Neuson Vibrating Plate', 'equipment', 'WN-VP-2023-7712', '',
    '2023-11-01', 12000.00, 9000.00, 'good', 'maintenance',
    NULL, NULL,
    'Depot - Workshop',
    '2026-04-20', '2026-05-10',
    'Currently in for engine service - expected back May 10'
  ),
  (
    'Hitachi Zaxis 8U Excavator', 'plant', 'HIT-8U-2024-4455', 'NSW-MEX-008',
    '2024-09-01', 95000.00, 80000.00, 'good', 'available',
    NULL, NULL,
    'Depot - Newcastle',
    '2026-03-15', '2026-06-15',
    '8 tonne mini excavator - rubber tracks'
  );
