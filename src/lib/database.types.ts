export type EmployeeRole = 'admin' | 'manager' | 'employee';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type WorkType = 'ordinary' | 'overtime' | 'double_time' | 'public_holiday';
export type ChecklistStatus = 'draft' | 'submitted' | 'flagged';
export type ExpenseCategory = 'materials' | 'fuel' | 'hire' | 'subcontractor' | 'other';
export type AssetType = 'plant' | 'vehicle' | 'equipment' | 'tool';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'decommissioned';
export type AssetStatus = 'available' | 'in_use' | 'maintenance' | 'retired';

export interface Employee {
  id: string;
  user_id: string | null;
  clerk_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  position: string;
  hourly_rate: number;
  employment_type: EmploymentType;
  start_date: string | null;
  is_active: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  status: ProjectStatus;
  budget: number;
  contract_value: number;
  cost_code: string;
  start_date: string | null;
  end_date: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  week_start_date: string;
  status: TimesheetStatus;
  total_hours: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  approver?: Employee;
}

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  project_id: string | null;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  hours: number;
  work_type: WorkType;
  description: string;
  created_at: string;
  project?: Project;
}

export interface DailyReport {
  id: string;
  project_id: string;
  reported_by: string;
  report_date: string;
  weather: string;
  temperature: string;
  workers_on_site: number;
  progress_notes: string;
  issues: string;
  materials_used: string;
  equipment_used: string;
  visitors: string;
  safety_incidents: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  project?: Project;
  reporter?: Employee;
}

export interface MachineChecklist {
  id: string;
  project_id: string;
  inspected_by: string;
  inspection_date: string;
  machine_name: string;
  machine_id_number: string;
  registration_number?: string;
  asset_id?: string;
  category?: string;
  hours_reading: number;
  status: ChecklistStatus;
  items: ChecklistItem[];
  notes: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  inspector?: Employee;
}

export interface ChecklistItem {
  category: string;
  item: string;
  status: 'ok' | 'fault' | 'na';
  comment: string;
}

export interface DailyExpense {
  id: string;
  daily_report_id: string | null;
  project_id: string;
  recorded_by: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receipt_number: string;
  receipt_key?: string;
  supplier: string;
  is_billable: boolean;
  created_at: string;
  project?: Project;
  recorder?: Employee;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  serial_number: string;
  registration: string;
  purchase_date: string | null;
  purchase_price: number;
  current_value: number;
  condition: AssetCondition;
  status: AssetStatus;
  assigned_project_id: string | null;
  assigned_employee_id: string | null;
  location: string;
  last_service_date: string | null;
  next_service_date: string | null;
  current_smu: number;
  last_service_smu: number;
  service_interval_value: number | null;
  service_interval_unit: 'hr' | 'km';
  notes: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  employee?: Employee;
}

export type Database = {
  public: {
    Tables: {
      employees: { Row: Employee; Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Employee> };
      projects: { Row: Project; Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Project> };
      timesheets: { Row: Timesheet; Insert: Omit<Timesheet, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Timesheet> };
      timesheet_entries: { Row: TimesheetEntry; Insert: Omit<TimesheetEntry, 'id' | 'created_at'>; Update: Partial<TimesheetEntry> };
      daily_reports: { Row: DailyReport; Insert: Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DailyReport> };
      machine_checklists: { Row: MachineChecklist; Insert: Omit<MachineChecklist, 'id' | 'created_at' | 'updated_at'>; Update: Partial<MachineChecklist> };
      daily_expenses: { Row: DailyExpense; Insert: Omit<DailyExpense, 'id' | 'created_at'>; Update: Partial<DailyExpense> };
      assets: { Row: Asset; Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Asset> };
    };
  };
};
