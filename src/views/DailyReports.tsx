import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import type { DailyReport, DailyExpense, ExpenseCategory, Employee, Project, TimesheetEntry } from '../lib/database.types';
import { format } from 'date-fns';
import ReceiptUpload from '../components/ReceiptUpload';
import { useAuthedFetch } from '../lib/api';

const categoryLabel: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  fuel: 'Fuel',
  hire: 'Hire',
  subcontractor: 'Subcontractor',
  other: 'Other',
};

const categoryColor: Record<ExpenseCategory, 'primary' | 'warning' | 'info' | 'secondary' | 'default'> = {
  materials: 'primary',
  fuel: 'warning',
  hire: 'info',
  subcontractor: 'secondary',
  other: 'default',
};

const emptyForm = {
  project_id: '',
  reported_by: '',
  report_date: format(new Date(), 'yyyy-MM-dd'),
  weather: '',
  temperature: '',
  workers_on_site: '0',
  progress_notes: '',
  issues: '',
  materials_used: '',
  equipment_used: '',
  visitors: '',
  safety_incidents: '',
  is_complete: false,
};

const emptyExpense = {
  category: 'materials' as ExpenseCategory,
  description: '',
  amount: '',
  receipt_number: '',
  receipt_key: '',
  supplier: '',
  is_billable: true,
};

export default function DailyReports() {
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DailyReport | null>(null);
  const [viewing, setViewing] = useState<DailyReport | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ ...emptyExpense });
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const authedFetch = useAuthedFetch();

  const fetchAll = async () => {
    setLoading(true);
    const [repRes, empRes, projRes] = await Promise.all([
      authedFetch('/api/daily-reports'),
      authedFetch('/api/employees'),
      authedFetch('/api/projects'),
    ]);
    const repData: DailyReport[] = repRes.ok ? await repRes.json() : [];
    const empData: Employee[] = empRes.ok ? await empRes.json() : [];
    const projData: Project[] = projRes.ok ? await projRes.json() : [];
    setReports(repData);
    setEmployees(empData.filter((e) => e.is_active));
    setProjects(projData.filter((p) => p.status === 'active' || p.status === 'planning'));
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const projectParam = searchParams.get('project');
    if (projectParam) setProjectFilter(projectParam);
  }, []);

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.project?.name?.toLowerCase().includes(q) ||
      (r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}`.toLowerCase().includes(q) : false) ||
      r.progress_notes.toLowerCase().includes(q);
    const matchProject = !projectFilter || r.project_id === projectFilter;
    return matchSearch && matchProject;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setExpenses([]);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = async (report: DailyReport) => {
    setEditing(report);
    setForm({
      project_id: report.project_id,
      reported_by: report.reported_by,
      report_date: report.report_date,
      weather: report.weather,
      temperature: report.temperature,
      workers_on_site: report.workers_on_site.toString(),
      progress_notes: report.progress_notes,
      issues: report.issues,
      materials_used: report.materials_used,
      equipment_used: report.equipment_used,
      visitors: report.visitors,
      safety_incidents: report.safety_incidents,
      is_complete: report.is_complete,
    });
    setError('');
    setExpensesLoading(true);

    const expRes = await authedFetch(`/api/daily-expenses?report_id=${report.id}`);
    setExpenses(expRes.ok ? await expRes.json() : []);
    setExpensesLoading(false);
    setDialogOpen(true);
  };

  const openView = async (report: DailyReport) => {
    setViewing(report);
    setViewDialogOpen(true);
    setExpensesLoading(true);

    const [expRes, tsRes] = await Promise.all([
      authedFetch(`/api/daily-expenses?report_id=${report.id}`),
      authedFetch(`/api/timesheets/entries?project_id=${report.project_id}&work_date=${report.report_date}`),
    ]);

    setExpenses(expRes.ok ? await expRes.json() : []);
    setTimesheetEntries(tsRes.ok ? await tsRes.json() : []);
    setExpensesLoading(false);
  };

  const handleSave = async () => {
    if (!form.project_id || !form.reported_by || !form.report_date) {
      setError('Project, reporter, and date are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      project_id: form.project_id,
      reported_by: form.reported_by,
      report_date: form.report_date,
      weather: form.weather,
      temperature: form.temperature,
      workers_on_site: parseInt(form.workers_on_site) || 0,
      progress_notes: form.progress_notes,
      issues: form.issues,
      materials_used: form.materials_used,
      equipment_used: form.equipment_used,
      visitors: form.visitors,
      safety_incidents: form.safety_incidents,
      is_complete: form.is_complete,
    };

    const res = editing
      ? await authedFetch(`/api/daily-reports/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await authedFetch('/api/daily-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to save report');
      return;
    }
    setDialogOpen(false);
    fetchAll();
  };

  const openAddExpense = () => {
    setExpenseForm({ ...emptyExpense });
    setExpenseError('');
    setExpenseDialogOpen(true);
  };

  const viewReceipt = async (receiptKey: string) => {
    try {
      const res = await authedFetch(`/api/download?key=${encodeURIComponent(receiptKey)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Unable to load receipt (${res.status})`);
      }
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank', 'noopener');
    } catch (err: any) {
      console.error('Receipt view failed', err);
      setExpenseError(err?.message ?? 'Unable to view receipt');
    }
  };

  const saveExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      setExpenseError('Description and amount are required.');
      return;
    }
    if (!viewing) return;
    setExpenseSaving(true);
    setExpenseError('');

    const payload = {
      daily_report_id: viewing.id,
      project_id: viewing.project_id,
      recorded_by: viewing.reported_by,
      expense_date: viewing.report_date,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount) || 0,
      receipt_number: expenseForm.receipt_number,
      receipt_key: expenseForm.receipt_key || null,
      supplier: expenseForm.supplier,
      is_billable: expenseForm.is_billable,
    };

    const res = await authedFetch('/api/daily-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setExpenseSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setExpenseError(body.error ?? 'Failed to save expense');
      return;
    }

    const created: DailyExpense = await res.json();
    setExpenseDialogOpen(false);
    setExpenseForm({ ...emptyExpense });
    setExpenses((prev) => [...prev, created]);
  };

  const deleteExpense = async (id: string) => {
    await authedFetch(`/api/daily-expenses/${id}`, { method: 'DELETE' });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Daily Diary</Typography>
          <Typography variant="body2" color="text.secondary">Site progress, weather, incidents, and expenses</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Report</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
        />
        <TextField
          select
          label="Filter by Project"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Projects</MenuItem>
          {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Reporter</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Weather</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Workers</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box textAlign="center" py={4}>
                        <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {search ? 'No reports match your search.' : 'No daily reports yet.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {format(new Date(report.report_date), 'EEE MMM d, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{report.project?.name ?? '---'}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">{report.reporter ? `${report.reporter.first_name} ${report.reporter.last_name}` : '---'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{report.weather || '---'}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{report.workers_on_site}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={report.is_complete ? 'Complete' : 'In Progress'} color={report.is_complete ? 'success' : 'warning'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View"><IconButton size="small" onClick={() => openView(report)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(report)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={600}>{editing ? 'Edit Daily Diary' : 'New Daily Diary'}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField label="Project" select required fullWidth value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Reported By" select required fullWidth value={form.reported_by}
                onChange={(e) => setForm({ ...form, reported_by: e.target.value })}>
                {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Report Date" type="date" required fullWidth value={form.report_date}
                onChange={(e) => setForm({ ...form, report_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Weather Conditions" fullWidth value={form.weather}
                onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="e.g. Sunny, Overcast, Rain" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Temperature" fullWidth value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder="e.g. 24 C" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Workers On Site" type="number" fullWidth value={form.workers_on_site}
                onChange={(e) => setForm({ ...form, workers_on_site: e.target.value })} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Progress Notes" multiline rows={3} fullWidth value={form.progress_notes}
                onChange={(e) => setForm({ ...form, progress_notes: e.target.value })} placeholder="What work was completed today?" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Issues / Delays" multiline rows={2} fullWidth value={form.issues}
                onChange={(e) => setForm({ ...form, issues: e.target.value })} placeholder="Any problems, delays, or blockers?" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Materials Used" multiline rows={2} fullWidth value={form.materials_used}
                onChange={(e) => setForm({ ...form, materials_used: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Equipment Used" multiline rows={2} fullWidth value={form.equipment_used}
                onChange={(e) => setForm({ ...form, equipment_used: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Visitors" fullWidth value={form.visitors}
                onChange={(e) => setForm({ ...form, visitors: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Safety Incidents" fullWidth value={form.safety_incidents}
                onChange={(e) => setForm({ ...form, safety_incidents: e.target.value })} placeholder="None, or describe any incidents" />
            </Grid>

            {/* Expenses Section */}
            <Grid item xs={12}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoneyIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="subtitle1" fontWeight={600}>Expenses</Typography>
                    {editing && expenses.length > 0 && (
                      <Chip label={`$${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}`} color="primary" size="small" />
                    )}
                  </Box>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddExpense}>
                    Add Expense
                  </Button>
                </Box>

                {editing && expenses.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenses.map((exp) => (
                          <TableRow key={exp.id} hover>
                            <TableCell>
                              <Chip label={categoryLabel[exp.category]} color={categoryColor[exp.category]} size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{exp.description}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600}>${exp.amount.toFixed(2)}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => deleteExpense(exp.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    {editing ? 'No expenses recorded yet.' : 'Expenses will be added after saving the report.'}
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant={form.is_complete ? 'contained' : 'outlined'}
                color="success"
                startIcon={form.is_complete ? <CheckCircleIcon /> : undefined}
                onClick={() => setForm({ ...form, is_complete: !form.is_complete })}
              >
                {form.is_complete ? 'Marked as Complete' : 'Mark as Complete'}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog with Expenses */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        {viewing && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Daily Diary</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(viewing.report_date), 'EEEE, MMMM d, yyyy')}
                  </Typography>
                </Box>
                <IconButton onClick={() => setViewDialogOpen(false)}><CloseIcon /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={viewing.project?.name ?? 'Unknown Project'} color="primary" />
                  <Chip label={viewing.is_complete ? 'Complete' : 'In Progress'} color={viewing.is_complete ? 'success' : 'warning'} />
                  {viewing.weather && (
                    <Chip icon={<WbSunnyIcon />} label={`${viewing.weather}${viewing.temperature ? ` - ${viewing.temperature}` : ''}`} variant="outlined" />
                  )}
                  {viewing.workers_on_site > 0 && (
                    <Chip icon={<PeopleIcon />} label={`${viewing.workers_on_site} workers`} variant="outlined" />
                  )}
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Reported by: {viewing.reporter ? `${viewing.reporter.first_name} ${viewing.reporter.last_name}` : '---'}
                </Typography>

                {viewing.progress_notes && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>Progress</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.progress_notes}</Typography>
                  </Box>
                )}
                {viewing.issues && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="warning.main" gutterBottom>Issues / Delays</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.issues}</Typography>
                  </Box>
                )}
                {viewing.safety_incidents && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} color="error.main" gutterBottom>Safety Incidents</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewing.safety_incidents}</Typography>
                  </Box>
                )}
                {(viewing.materials_used || viewing.equipment_used) && (
                  <Grid container spacing={2}>
                    {viewing.materials_used && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>Materials</Typography>
                        <Typography variant="body2">{viewing.materials_used}</Typography>
                      </Grid>
                    )}
                    {viewing.equipment_used && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>Equipment</Typography>
                        <Typography variant="body2">{viewing.equipment_used}</Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
                {viewing.visitors && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>Visitors</Typography>
                    <Typography variant="body2">{viewing.visitors}</Typography>
                  </Box>
                )}

                {/* Expenses Section */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoneyIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" fontWeight={600}>Expenses</Typography>
                      {totalExpenses > 0 && (
                        <Chip label={`$${totalExpenses.toFixed(2)}`} color="primary" size="small" />
                      )}
                    </Box>
                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddExpense}>
                      Add Expense
                    </Button>
                  </Box>

                  {expensesLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
                  ) : expenses.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                      No expenses recorded for this day.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Receipt</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {expenses.map((exp) => (
                            <TableRow key={exp.id} hover>
                              <TableCell>
                                <Chip label={categoryLabel[exp.category]} color={categoryColor[exp.category]} size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{exp.description}</Typography>
                                {!exp.is_billable && <Chip label="Non-billable" size="small" variant="outlined" sx={{ ml: 0.5 }} />}
                              </TableCell>
                              <TableCell><Typography variant="body2">{exp.supplier || '---'}</Typography></TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600}>${exp.amount.toFixed(2)}</Typography>
                              </TableCell>
                              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                {exp.receipt_key ? (
                                  <Button size="small" variant="outlined" onClick={() => viewReceipt(exp.receipt_key!)}>
                                    View receipt
                                  </Button>
                                ) : exp.receipt_number ? (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ReceiptIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption">{exp.receipt_number}</Typography>
                                  </Box>
                                ) : '---'}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" color="error" onClick={() => deleteExpense(exp.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={3} />
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={700}>${totalExpenses.toFixed(2)}</Typography>
                            </TableCell>
                            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }} />
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {/* Linked Timesheet Entries */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AccessTimeIcon sx={{ color: 'success.main' }} />
                    <Typography variant="subtitle1" fontWeight={600}>Timesheet Entries</Typography>
                    {timesheetEntries.length > 0 && (
                      <Chip label={`${timesheetEntries.length} entries`} color="success" size="small" />
                    )}
                  </Box>

                  {expensesLoading ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
                  ) : timesheetEntries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                      No timesheet entries for this day.
                    </Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Hours</TableCell>
                            <TableCell>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {timesheetEntries.map((entry) => (
                            <TableRow key={entry.id} hover>
                              <TableCell>
                                <Chip
                                  label={entry.work_type.charAt(0).toUpperCase() + entry.work_type.slice(1).replace(/_/g, ' ')}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600}>{entry.hours}h</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.description || '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                          {timesheetEntries.length > 0 && (
                            <TableRow>
                              <TableCell />
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={700}>
                                  {timesheetEntries.reduce((sum, e) => sum + e.hours, 0)}h total
                                </Typography>
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); openEdit(viewing); }}>
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>Add Expense</DialogTitle>
        <DialogContent dividers>
          {expenseError && <Alert severity="error" sx={{ mb: 2 }}>{expenseError}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Category"
              select
              fullWidth
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
            >
              {Object.entries(categoryLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField
              label="Description"
              required
              fullWidth
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="e.g. 20mm aggregate, diesel refuel"
            />
            <TextField
              label="Amount ($)"
              type="number"
              required
              fullWidth
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              label="Supplier"
              fullWidth
              value={expenseForm.supplier}
              onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
              placeholder="e.g. Bunnings, Caltex"
            />
            <TextField
              label="Receipt Number"
              fullWidth
              value={expenseForm.receipt_number}
              onChange={(e) => setExpenseForm({ ...expenseForm, receipt_number: e.target.value })}
            />
            <ReceiptUpload
              value={expenseForm.receipt_key || null}
              onChange={(key) => setExpenseForm({ ...expenseForm, receipt_key: key ?? '' })}
              label="Receipt attachment"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveExpense} disabled={expenseSaving}>
            {expenseSaving ? 'Saving...' : 'Add Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
