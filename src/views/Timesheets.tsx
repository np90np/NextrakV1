import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
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
import Divider from '@mui/material/Divider';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import useApi from '../lib/apiClient';
import type { Timesheet, TimesheetEntry, TimesheetStatus, Employee, Project, WorkType } from '../lib/database.types';
import { format, startOfWeek, addDays } from 'date-fns';

const statusColor: Record<TimesheetStatus, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
};

const workTypeLabel: Record<WorkType, string> = {
  ordinary: 'Ordinary',
  overtime: 'Overtime',
  double_time: 'Double Time',
  public_holiday: 'Public Holiday',
};

export default function Timesheets() {
  const api = useApi();
  const [tab, setTab] = useState(0);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [tsDialogOpen, setTsDialogOpen] = useState(false);
  const [selectedTs, setSelectedTs] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [entryForm, setEntryForm] = useState({
    project_id: '',
    work_date: '',
    hours: '',
    work_type: 'ordinary' as WorkType,
    description: '',
  });

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalTs, setApprovalTs] = useState<Timesheet | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [newTsForm, setNewTsForm] = useState({ employee_id: '', week_start_date: '' });
  const [newTsDialogOpen, setNewTsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tsData, empData, projData] = await Promise.all([
        api.get('/api/timesheets'),
        api.get('/api/employees?active=true'),
        api.get('/api/projects?status=active'),
      ]);
      setTimesheets(tsData ?? []);
      setEmployees(empData ?? []);
      setProjects(projData ?? []);
    } catch (err: any) {
      console.error('fetchAll error', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredTs = timesheets.filter((t) => {
    if (tab === 0) return true;
    const statusMap: Record<number, TimesheetStatus> = { 1: 'submitted', 2: 'approved', 3: 'draft', 4: 'rejected' };
    return t.status === statusMap[tab];
  });

  const openTimesheet = async (ts: Timesheet) => {
    setSelectedTs(ts);
    setEntriesLoading(true);
    setTsDialogOpen(true);
    try {
      const res = await api.get(`/api/timesheets/${ts.id}`);
      setEntries(res.entries ?? []);
    } catch (err: any) {
      console.error('openTimesheet error', err);
    }
    setEntriesLoading(false);
  };

  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryForm({ project_id: '', work_date: '', hours: '', work_type: 'ordinary', description: '' });
    setError('');
    setEntryDialogOpen(true);
  };

  const openEditEntry = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      project_id: entry.project_id ?? '',
      work_date: entry.work_date,
      hours: entry.hours.toString(),
      work_type: entry.work_type,
      description: entry.description,
    });
    setError('');
    setEntryDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!entryForm.work_date || !entryForm.hours) { setError('Date and hours are required.'); return; }
    setSaving(true);
    const payload = {
      timesheet_id: selectedTs!.id,
      project_id: entryForm.project_id || null,
      work_date: entryForm.work_date,
      hours: parseFloat(entryForm.hours),
      work_type: entryForm.work_type,
      description: entryForm.description,
    };
    try {
      if (editingEntry) {
        await api.put(`/api/timesheets/entries/${editingEntry.id}`, payload);
      } else {
        await api.post('/api/timesheets/entries', payload);
      }
      setSaving(false);
      setEntryDialogOpen(false);
      openTimesheet(selectedTs!);
      fetchAll();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || String(err));
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      await api.del(`/api/timesheets/entries/${entryId}`);
      openTimesheet(selectedTs!);
      fetchAll();
    } catch (err: any) {
      console.error('deleteEntry error', err);
    }
  };

  const submitTimesheet = async (ts: Timesheet) => {
    try {
      await api.put(`/api/timesheets/${ts.id}`, { status: 'submitted' });
      fetchAll();
      if (selectedTs?.id === ts.id) setSelectedTs({ ...ts, status: 'submitted' });
    } catch (err: any) {
      console.error('submitTimesheet error', err);
    }
  };

  const openApproval = (ts: Timesheet) => {
    setApprovalTs(ts);
    setRejectionReason('');
    setApprovalDialogOpen(true);
  };

  const approveTimesheet = async () => {
    if (!approvalTs) return;
    try {
      await api.put(`/api/timesheets/${approvalTs.id}`, { status: 'approved', approved_at: new Date().toISOString() });
      setApprovalDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      console.error('approveTimesheet error', err);
    }
  };

  const rejectTimesheet = async () => {
    if (!approvalTs) return;
    try {
      await api.put(`/api/timesheets/${approvalTs.id}`, { status: 'rejected', rejection_reason: rejectionReason });
      setApprovalDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      console.error('rejectTimesheet error', err);
    }
  };

  const createTimesheet = async () => {
    if (!newTsForm.employee_id || !newTsForm.week_start_date) {
      setError('Employee and week start date are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/timesheets', {
        employee_id: newTsForm.employee_id,
        week_start_date: newTsForm.week_start_date,
        status: 'draft',
        total_hours: 0,
      });
      setSaving(false);
      setNewTsDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || String(err));
    }
  };

  const thisWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Timesheets</Typography>
          <Typography variant="body2" color="text.secondary">Submit, review, and approve weekly timesheets</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setNewTsForm({ employee_id: '', week_start_date: thisWeek }); setError(''); setNewTsDialogOpen(true); }}>
          New Timesheet
        </Button>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="All" />
            <Tab label="Pending Approval" />
            <Tab label="Approved" />
            <Tab label="Draft" />
            <Tab label="Rejected" />
          </Tabs>
        </Box>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Week</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                  ))
                ) : filteredTs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box textAlign="center" py={4}>
                        <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No timesheets found.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : filteredTs.map((ts) => (
                  <TableRow key={ts.id} hover sx={{ cursor: 'pointer' }} onClick={() => openTimesheet(ts)}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {ts.employee ? `${ts.employee.first_name} ${ts.employee.last_name}` : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{ts.employee?.position}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(ts.week_start_date), 'MMM d')} – {format(addDays(new Date(ts.week_start_date), 6), 'MMM d, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2" fontWeight={600}>{ts.total_hours}h</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={ts.status.charAt(0).toUpperCase() + ts.status.slice(1)} color={statusColor[ts.status]} size="small" />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {ts.status === 'draft' && (
                          <Tooltip title="Submit for Approval">
                            <IconButton size="small" color="primary" onClick={() => submitTimesheet(ts)}>
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {ts.status === 'submitted' && (
                          <Tooltip title="Review">
                            <IconButton size="small" color="warning" onClick={() => openApproval(ts)}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Timesheet Detail Dialog */}
      <Dialog open={tsDialogOpen} onClose={() => setTsDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedTs && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Timesheet — {selectedTs.employee ? `${selectedTs.employee.first_name} ${selectedTs.employee.last_name}` : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Week: {format(new Date(selectedTs.week_start_date), 'MMM d')} – {format(addDays(new Date(selectedTs.week_start_date), 6), 'MMM d, yyyy')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={selectedTs.status.charAt(0).toUpperCase() + selectedTs.status.slice(1)} color={statusColor[selectedTs.status]} />
                  <IconButton onClick={() => setTsDialogOpen(false)}><CloseIcon /></IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Total: {selectedTs.total_hours}h
                </Typography>
                {(selectedTs.status === 'draft' || selectedTs.status === 'rejected') && (
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openNewEntry}>
                    Add Entry
                  </Button>
                )}
              </Box>

              {selectedTs.rejection_reason && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Rejected: {selectedTs.rejection_reason}
                </Alert>
              )}

              {entriesLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 1 }} />)
              ) : entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No entries yet.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Hours</TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Notes</TableCell>
                        {(selectedTs.status === 'draft' || selectedTs.status === 'rejected') && <TableCell align="right">Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.work_date), 'EEE MMM d')}</TableCell>
                          <TableCell>{entry.project?.name ?? '—'}</TableCell>
                          <TableCell>
                            <Chip label={workTypeLabel[entry.work_type]} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{entry.hours}h</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="caption" color="text.secondary">{entry.description || '—'}</Typography>
                          </TableCell>
                          {(selectedTs.status === 'draft' || selectedTs.status === 'rejected') && (
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => openEditEntry(entry)}><EditIcon fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => deleteEntry(entry.id)}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setTsDialogOpen(false)}>Close</Button>
              {selectedTs.status === 'draft' && (
                <Button variant="contained" color="primary" startIcon={<SendIcon />} onClick={() => { submitTimesheet(selectedTs); setTsDialogOpen(false); }}>
                  Submit for Approval
                </Button>
              )}
              {selectedTs.status === 'submitted' && (
                <Button variant="contained" color="success" onClick={() => { setTsDialogOpen(false); openApproval(selectedTs); }}>
                  Review & Approve
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Entry Dialog */}
      <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>{editingEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Date"
              type="date"
              required
              fullWidth
              value={entryForm.work_date}
              onChange={(e) => setEntryForm({ ...entryForm, work_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Project"
              select
              fullWidth
              value={entryForm.project_id}
              onChange={(e) => setEntryForm({ ...entryForm, project_id: e.target.value })}
            >
              <MenuItem value="">— No Project —</MenuItem>
              {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
            <TextField
              label="Hours"
              type="number"
              required
              fullWidth
              inputProps={{ min: 0, max: 24, step: 0.5 }}
              value={entryForm.hours}
              onChange={(e) => setEntryForm({ ...entryForm, hours: e.target.value })}
            />
            <TextField
              label="Work Type"
              select
              fullWidth
              value={entryForm.work_type}
              onChange={(e) => setEntryForm({ ...entryForm, work_type: e.target.value as WorkType })}
            >
              {Object.entries(workTypeLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField
              label="Description / Notes"
              multiline
              rows={2}
              fullWidth
              value={entryForm.description}
              onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEntry} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>Review Timesheet</DialogTitle>
        <DialogContent dividers>
          {approvalTs && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Employee: <strong>{approvalTs.employee ? `${approvalTs.employee.first_name} ${approvalTs.employee.last_name}` : '—'}</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Week: <strong>{format(new Date(approvalTs.week_start_date), 'MMM d, yyyy')}</strong>
              </Typography>
              <Typography variant="body2" gutterBottom>
                Total Hours: <strong>{approvalTs.total_hours}h</strong>
              </Typography>
              <Divider sx={{ my: 2 }} />
              <TextField
                label="Rejection Reason (if rejecting)"
                multiline
                rows={3}
                fullWidth
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Optional — required only if rejecting"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" color="error" startIcon={<CloseIcon />} onClick={rejectTimesheet} disabled={!rejectionReason}>
            Reject
          </Button>
          <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={approveTimesheet}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Timesheet Dialog */}
      <Dialog open={newTsDialogOpen} onClose={() => setNewTsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>New Timesheet</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Employee"
              select
              required
              fullWidth
              value={newTsForm.employee_id}
              onChange={(e) => setNewTsForm({ ...newTsForm, employee_id: e.target.value })}
            >
              {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>)}
            </TextField>
            <TextField
              label="Week Starting (Monday)"
              type="date"
              required
              fullWidth
              value={newTsForm.week_start_date}
              onChange={(e) => setNewTsForm({ ...newTsForm, week_start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewTsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createTimesheet} disabled={saving}>
            {saving ? 'Creating…' : 'Create Timesheet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
