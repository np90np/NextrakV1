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
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import useApi from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import type { Timesheet, TimesheetEntry, TimesheetStatus, Project, WorkType } from '../lib/database.types';
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

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function timeToHMS(time: string): { hour: string; minute: string; period: string } {
  if (!time) return { hour: '', minute: '', period: 'AM' };
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour: String(hour12), minute: String(m).padStart(2, '0'), period };
}

function hmsToTime(hour: string, minute: string, period: string): string {
  if (!hour || !minute) return '';
  let h = parseInt(hour);
  if (period === 'AM') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${String(h).padStart(2, '0')}:${minute}`;
}

export default function MyTimesheet() {
  const { employee: authEmployee } = useAuth();
  const api = useApi();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTs, setSelectedTs] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [entryForm, setEntryForm] = useState({
    project_id: '',
    work_date: '',
    start_time: '',
    end_time: '',
    hours: '',
    break_minutes: '0',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newTsDialogOpen, setNewTsDialogOpen] = useState(false);
  const [newTsWeek, setNewTsWeek] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [copyFromPrev, setCopyFromPrev] = useState(true);
  const [copySourcePreview, setCopySourcePreview] = useState<{ id: string; weekStart: string; entryCount: number } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    if (authEmployee) {
      try {
        const [tsData, projData] = await Promise.all([
          api.get(`/api/timesheets?employee_id=${authEmployee.id}`),
          api.get('/api/projects?status=active'),
        ]);
        setTimesheets(tsData ?? []);
        setProjects(projData ?? []);
      } catch (err: any) {
        console.error('fetchAll error', err);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [authEmployee]);

  const fetchEntries = async (tsId: string) => {
    setEntriesLoading(true);
    try {
      const res = await api.get(`/api/timesheets/${tsId}`);
      setEntries(res.entries ?? []);
      if (res.timesheet) setSelectedTs((prev) => prev?.id === tsId ? { ...prev, total_hours: res.timesheet.total_hours } : prev);
    } catch (err: any) {
      console.error('fetchEntries error', err);
    }
    setEntriesLoading(false);
  };

  const openTimesheet = async (ts: Timesheet) => {
    setSelectedTs(ts);
    setEntries([]);
    setDetailOpen(true);
    await fetchEntries(ts.id);
  };

  const openNewEntry = (defaultDate?: string) => {
    setEditingEntry(null);
    setEntryForm({
      project_id: projects[0]?.id ?? '',
      work_date: defaultDate ?? '',
      start_time: '',
      end_time: '',
      hours: '',
      break_minutes: '0',
      description: '',
    });
    setError('');
    setEntryDialogOpen(true);
  };

  const openEditEntry = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setEntryForm({
      project_id: entry.project_id ?? '',
      work_date: entry.work_date,
      start_time: (entry.start_time ?? '').slice(0, 5),
      end_time: (entry.end_time ?? '').slice(0, 5),
      hours: entry.hours.toString(),
      break_minutes: (entry.break_minutes ?? 0).toString(),
      description: entry.description,
    });
    setError('');
    setEntryDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!entryForm.work_date || !entryForm.start_time || !entryForm.end_time) {
      setError('Date, start time, and end time are required.');
      return;
    }
    setSaving(true);
    const payload = {
      timesheet_id: selectedTs!.id,
      project_id: entryForm.project_id || null,
      work_date: entryForm.work_date,
      start_time: entryForm.start_time,
      end_time: entryForm.end_time,
      hours: parseFloat(entryForm.hours),
      break_minutes: parseInt(entryForm.break_minutes),
      work_type: 'ordinary' as WorkType,
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
      await fetchEntries(selectedTs!.id);
      fetchAll();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || String(err));
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      await api.del(`/api/timesheets/entries/${entryId}`);
      await fetchEntries(selectedTs!.id);
      fetchAll();
    } catch (err: any) {
      console.error('deleteEntry error', err);
    }
  };

  const submitTimesheet = async () => {
    if (!selectedTs) return;
    try {
      await api.put(`/api/timesheets/${selectedTs.id}`, { status: 'submitted', total_hours: selectedTs.total_hours });
      setDetailOpen(false);
      fetchAll();
    } catch (err: any) {
      console.error('submitTimesheet error', err);
    }
  };

  // Find the most recent timesheet before the target week (used as copy source)
  const findCopySource = async (targetWeek: string): Promise<{ id: string; weekStart: string; entryCount: number } | null> => {
    if (!authEmployee) return null;
    const prior = timesheets
      .filter((t) => String(t.week_start_date).slice(0, 10) < targetWeek)
      .sort((a, b) => String(b.week_start_date).slice(0, 10).localeCompare(String(a.week_start_date).slice(0, 10)))[0];
    if (!prior) return null;
    try {
      const res = await api.get(`/api/timesheets/${prior.id}`);
      const count = (res.entries ?? []).length;
      if (count === 0) return null;
      return { id: prior.id, weekStart: String(prior.week_start_date).slice(0, 10), entryCount: count };
    } catch {
      return null;
    }
  };

  const openNewTimesheet = async () => {
    setError('');
    const targetWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    setNewTsWeek(targetWeek);
    setCopyFromPrev(true);
    setCopySourcePreview(null);
    setNewTsDialogOpen(true);
    const src = await findCopySource(targetWeek);
    setCopySourcePreview(src);
  };

  // Refresh preview when user changes target week
  useEffect(() => {
    if (!newTsDialogOpen) return;
    findCopySource(newTsWeek).then(setCopySourcePreview);
  }, [newTsWeek, newTsDialogOpen]);

  const createTimesheet = async () => {
    if (!authEmployee) return;
    setSaving(true);
    try {
      await api.post('/api/timesheets', {
        employee_id: authEmployee.id,
        week_start_date: newTsWeek,
        status: 'draft',
        total_hours: 0,
        copy_from_id: copyFromPrev && copySourcePreview ? copySourcePreview.id : undefined,
      });
      setSaving(false);
      setNewTsDialogOpen(false);
      fetchAll();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || String(err));
    }
  };

  const canEdit = selectedTs?.status === 'draft' || selectedTs?.status === 'rejected' || selectedTs?.status === 'submitted';

  const calculateHours = (startTime: string, endTime: string, breakMinutes: number): number => {
    if (!startTime || !endTime) return 0;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    let diffMinutes = endMinutes - startMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const workMinutes = diffMinutes - breakMinutes;
    return Math.max(0, workMinutes / 60);
  };

  const handleTimeChange = (field: 'start_time' | 'end_time' | 'break_minutes', value: string) => {
    const newForm = { ...entryForm, [field]: value };
    if (field === 'start_time' || field === 'end_time' || field === 'break_minutes') {
      const breakMins = parseInt(newForm.break_minutes) || 0;
      const calculated = calculateHours(newForm.start_time, newForm.end_time, breakMins);
      newForm.hours = calculated > 0 ? calculated.toFixed(2) : '';
    }
    setEntryForm(newForm);
  };

  const getEntriesByDay = () => {
    if (!selectedTs) return {};
    const [y, m, d] = selectedTs.week_start_date.slice(0, 10).split('-').map(Number);
    const weekStart = new Date(y, m - 1, d);
    const byDay: Record<string, TimesheetEntry[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const key = format(day, 'yyyy-MM-dd');
      byDay[key] = entries.filter((e) => String(e.work_date).slice(0, 10) === key);
    }
    return byDay;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>My Timesheet</Typography>
          <Typography variant="body2" color="text.secondary">
            Submit your weekly hours for approval
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNewTimesheet}>
          New Week
        </Button>
      </Box>

      {!authEmployee && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No employee profile found. Please ask your administrator to add you as an employee first.
        </Alert>
      )}

      {/* Timesheet List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Week Starting</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}><Box sx={{ height: 20, bgcolor: 'grey.100', borderRadius: 1 }} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : timesheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box textAlign="center" py={4}>
                        <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          No timesheets yet. Click "New Week" to create one.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : timesheets.map((ts) => (
                  <TableRow key={ts.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {format(new Date(ts.week_start_date), 'MMM d')} – {format(addDays(new Date(ts.week_start_date), 6), 'MMM d, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{ts.total_hours}h</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                        color={statusColor[ts.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={() => openTimesheet(ts)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Timesheet Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth>
        {selectedTs && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Week: {format(new Date(selectedTs.week_start_date), 'MMM d')} – {format(addDays(new Date(selectedTs.week_start_date), 6), 'MMM d, yyyy')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip label={selectedTs.status.charAt(0).toUpperCase() + selectedTs.status.slice(1)} color={statusColor[selectedTs.status]} size="small" />
                    <Typography variant="body2" color="text.secondary">Total: {selectedTs.total_hours}h</Typography>
                  </Box>
                </Box>
                <Button startIcon={<ArrowBackIcon />} onClick={() => setDetailOpen(false)}>Back</Button>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {selectedTs.rejection_reason && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Rejected: {selectedTs.rejection_reason}
                </Alert>
              )}

              {entriesLoading ? (
                <Box py={3} textAlign="center"><Typography color="text.secondary">Loading entries...</Typography></Box>
              ) : (
                <Stack spacing={2}>
                  {Object.entries(getEntriesByDay()).map(([dateKey, dayEntries], dayIdx) => (
                    <Card key={dateKey} variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {dayNames[dayIdx]} — {format(new Date(dateKey), 'MMM d')}
                          </Typography>
                          {canEdit && (
                            <Button size="small" startIcon={<AddIcon />} onClick={() => openNewEntry(dateKey)}>
                              Add
                            </Button>
                          )}
                        </Box>
                        {dayEntries.length === 0 ? (
                          <Typography variant="caption" color="text.disabled">No entries</Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Project / Code</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Hours</TableCell>
                                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Notes</TableCell>
                                {canEdit && <TableCell align="right">Actions</TableCell>}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {dayEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                  <TableCell>
                                    <Box>
                                      <Typography variant="body2">{entry.project?.name ?? '—'}</Typography>
                                      {entry.project?.cost_code && <Typography variant="caption" color="text.secondary">Code: {entry.project.cost_code}</Typography>}
                                    </Box>
                                  </TableCell>
                                  <TableCell><Chip label={workTypeLabel[entry.work_type]} size="small" variant="outlined" /></TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{entry.hours}h</TableCell>
                                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="caption" color="text.secondary">{entry.description || '—'}</Typography></TableCell>
                                  {canEdit && (
                                    <TableCell align="right">
                                      <IconButton size="small" onClick={() => openEditEntry(entry)}><EditIcon fontSize="small" /></IconButton>
                                      <IconButton size="small" color="error" onClick={() => deleteEntry(entry.id)}><DeleteIcon fontSize="small" /></IconButton>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
              {canEdit && (
                <Button variant="contained" startIcon={<SendIcon />} onClick={submitTimesheet}>
                  Submit for Approval
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
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <span>{p.name}</span>
                    {p.cost_code && <Typography variant="caption" sx={{ color: 'text.secondary' }}>Code: {p.cost_code}</Typography>}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>Work Hours</Typography>
              {(['start_time', 'end_time'] as const).map((field) => {
                const hms = timeToHMS(entryForm[field]);
                const label = field === 'start_time' ? 'Start Time' : 'Finish Time';
                const onChange = (part: 'hour' | 'minute' | 'period', val: string) => {
                  const updated = { ...hms, [part]: val };
                  handleTimeChange(field, hmsToTime(updated.hour, updated.minute, updated.period));
                };
                return (
                  <Box key={field}>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {label} *
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <TextField
                        select size="small" label="Hour"
                        value={hms.hour}
                        onChange={(e) => onChange('hour', e.target.value)}
                        sx={{ flex: 2 }}
                        SelectProps={{ MenuProps: { PaperProps: { style: { maxHeight: 220 } } } }}
                      >
                        <MenuItem value=""><em>—</em></MenuItem>
                        {HOUR_OPTIONS.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Min"
                        value={hms.minute}
                        onChange={(e) => onChange('minute', e.target.value)}
                        sx={{ flex: 1.5 }}
                      >
                        <MenuItem value=""><em>—</em></MenuItem>
                        {MINUTE_OPTIONS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="AM/PM"
                        value={hms.period}
                        onChange={(e) => onChange('period', e.target.value)}
                        sx={{ flex: 1.5 }}
                      >
                        <MenuItem value="AM">AM</MenuItem>
                        <MenuItem value="PM">PM</MenuItem>
                      </TextField>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
            <TextField
              label="Break Time (minutes)"
              type="number"
              fullWidth
              inputProps={{ min: 0, max: 480, step: 15 }}
              value={entryForm.break_minutes}
              onChange={(e) => handleTimeChange('break_minutes', e.target.value)}
            />
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Total Hours Worked</Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {entryForm.hours ? `${entryForm.hours}h` : '—'}
              </Typography>
            </Box>
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
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Timesheet Dialog */}
      <Dialog open={newTsDialogOpen} onClose={() => setNewTsDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>New Timesheet Week</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Week Starting (Monday)"
              type="date"
              required
              fullWidth
              value={newTsWeek}
              onChange={(e) => setNewTsWeek(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            {copySourcePreview ? (
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                <FormControlLabel
                  control={<Switch checked={copyFromPrev} onChange={(e) => setCopyFromPrev(e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Copy from previous week</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {copySourcePreview.entryCount} {copySourcePreview.entryCount === 1 ? 'entry' : 'entries'} from week of {format(parseLocalDate(copySourcePreview.weekStart), 'MMM d')}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', m: 0 }}
                />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No prior timesheet found to copy from.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewTsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createTimesheet} disabled={saving}>
            {saving ? 'Creating…' : (copyFromPrev && copySourcePreview ? `Create + Copy ${copySourcePreview.entryCount}` : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
