import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import Checkbox from '@mui/material/Checkbox';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Timesheet } from '../lib/database.types';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAuthedFetch } from '../lib/api';

function generateMYOBTimesheetCSV(timesheets: Timesheet[], entries: Record<string, TimesheetEntryWithProject[]>): string {
  const rows: string[] = [];

  rows.push([
    'Co./Last Name',
    'First Name',
    'Payroll Category',
    'Date',
    'Start Time',
    'End Time',
    'Hours',
    'Job',
    'Notes',
  ].join(','));

  for (const ts of timesheets) {
    const tsEntries = entries[ts.id] ?? [];
    for (const entry of tsEntries) {
      const payrollCategory =
        entry.work_type === 'overtime' ? 'Overtime'
        : entry.work_type === 'double_time' ? 'Double Time'
        : entry.work_type === 'public_holiday' ? 'Public Holiday'
        : 'Base Hourly';

      rows.push([
        csvEscape(ts.employee?.last_name ?? ''),
        csvEscape(ts.employee?.first_name ?? ''),
        csvEscape(payrollCategory),
        format(new Date(entry.work_date), 'dd/MM/yyyy'),
        '',
        '',
        entry.hours.toFixed(2),
        csvEscape(entry.project?.name ?? ''),
        csvEscape(entry.description),
      ].join(','));
    }
  }

  return rows.join('\n');
}

function generateTimesheetSummaryCSV(timesheets: Timesheet[]): string {
  const rows: string[] = [];
  rows.push([
    'Employee Last Name',
    'Employee First Name',
    'Week Starting',
    'Week Ending',
    'Total Hours',
    'Status',
    'Approved Date',
  ].join(','));

  for (const ts of timesheets) {
    const weekEnd = new Date(ts.week_start_date);
    weekEnd.setDate(weekEnd.getDate() + 6);
    rows.push([
      csvEscape(ts.employee?.last_name ?? ''),
      csvEscape(ts.employee?.first_name ?? ''),
      format(new Date(ts.week_start_date), 'dd/MM/yyyy'),
      format(weekEnd, 'dd/MM/yyyy'),
      ts.total_hours.toFixed(2),
      ts.status,
      ts.approved_at ? format(new Date(ts.approved_at), 'dd/MM/yyyy') : '',
    ].join(','));
  }

  return rows.join('\n');
}

function generateDailyReportsCSV(reports: DailyReportRow[]): string {
  const rows: string[] = [];
  rows.push([
    'Date',
    'Project',
    'Reported By',
    'Weather',
    'Temperature',
    'Workers On Site',
    'Progress Notes',
    'Issues',
    'Materials Used',
    'Equipment Used',
    'Visitors',
    'Safety Incidents',
    'Status',
  ].join(','));

  for (const r of reports) {
    rows.push([
      format(new Date(r.report_date), 'dd/MM/yyyy'),
      csvEscape(r.project?.name ?? ''),
      csvEscape(r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : ''),
      csvEscape(r.weather),
      csvEscape(r.temperature),
      r.workers_on_site.toString(),
      csvEscape(r.progress_notes),
      csvEscape(r.issues),
      csvEscape(r.materials_used),
      csvEscape(r.equipment_used),
      csvEscape(r.visitors),
      csvEscape(r.safety_incidents),
      r.is_complete ? 'Complete' : 'In Progress',
    ].join(','));
  }

  return rows.join('\n');
}

function csvEscape(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface TimesheetEntryWithProject {
  id: string;
  work_date: string;
  hours: number;
  work_type: string;
  description: string;
  project?: { name: string };
}

interface DailyReportRow {
  id: string;
  report_date: string;
  project_id: string;
  reported_by: string;
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
  project?: { name: string };
  reporter?: { first_name: string; last_name: string };
}

export default function Export() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(subMonths(new Date(), 0)), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('approved');
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [exported, setExported] = useState(false);
  const authedFetch = useAuthedFetch();

  const fetchTimesheets = async () => {
    setLoading(true);
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    if (statusFilter !== 'all') params.set('status', statusFilter);
    const res = await authedFetch(`/api/timesheets?${params.toString()}`);
    const data: Timesheet[] = res.ok ? await res.json() : [];
    setTimesheets(data);
    setSelectedIds(new Set(data.map((t) => t.id)));
    setLoading(false);
    setExported(false);
  };

  useEffect(() => { fetchTimesheets(); }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === timesheets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(timesheets.map((t) => t.id)));
  };

  const handleExportMYOB = async () => {
    const selected = timesheets.filter((t) => selectedIds.has(t.id));
    const entriesMap: Record<string, TimesheetEntryWithProject[]> = {};

    for (const ts of selected) {
      const res = await authedFetch(`/api/timesheets/entries?timesheet_id=${ts.id}`);
      entriesMap[ts.id] = res.ok ? await res.json() : [];
    }

    const csv = generateMYOBTimesheetCSV(selected, entriesMap);
    const filename = `MYOB_Timesheets_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    downloadCSV(csv, filename);
    setExported(true);
  };

  const handleExportSummary = () => {
    const selected = timesheets.filter((t) => selectedIds.has(t.id));
    const csv = generateTimesheetSummaryCSV(selected);
    downloadCSV(csv, `Timesheet_Summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    setExported(true);
  };

  const handleExportReports = async () => {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    const res = await authedFetch(`/api/daily-reports?${params.toString()}`);
    const data: DailyReportRow[] = res.ok ? await res.json() : [];
    const csv = generateDailyReportsCSV(data);
    downloadCSV(csv, `Daily_Reports_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    setExported(true);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Export Data</Typography>
        <Typography variant="body2" color="text.secondary">
          Export timesheets and reports as CSV files compatible with MYOB AccountRight
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* MYOB Info Card */}
        <Grid item xs={12}>
          <Alert
            icon={<InfoIcon />}
            severity="info"
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2" fontWeight={600}>MYOB AccountRight Import</Typography>
            <Typography variant="caption">
              The MYOB Timesheet CSV export uses the Payroll Activity format. Go to MYOB → Payroll → Timesheets → Import, then select the downloaded file.
              Map columns: Co./Last Name → Employee Last Name, First Name → Employee First Name, Payroll Category → Payroll Category, Date → Date, Hours → Hours.
            </Typography>
          </Alert>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Export Filters</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date From"
                    type="date"
                    fullWidth
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date To"
                    type="date"
                    fullWidth
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Timesheet Status"
                    select
                    fullWidth
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="submitted">Submitted</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={1}>
                  <Button variant="outlined" onClick={fetchTimesheets} fullWidth>
                    Filter
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Timesheet Export */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Timesheets ({selectedIds.size} selected)
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportSummary}
                    disabled={selectedIds.size === 0}
                  >
                    Summary CSV
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportMYOB}
                    disabled={selectedIds.size === 0}
                  >
                    MYOB Export
                  </Button>
                </Stack>
              </Box>

              {exported && (
                <Alert icon={<CheckCircleIcon />} severity="success" sx={{ mb: 2 }} onClose={() => setExported(false)}>
                  Export downloaded successfully.
                </Alert>
              )}

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          indeterminate={selectedIds.size > 0 && selectedIds.size < timesheets.length}
                          checked={selectedIds.size === timesheets.length && timesheets.length > 0}
                          onChange={toggleAll}
                        />
                      </TableCell>
                      <TableCell>Employee</TableCell>
                      <TableCell>Week</TableCell>
                      <TableCell>Hours</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                      ))
                    ) : timesheets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                            No timesheets found for the selected period and status.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : timesheets.map((ts) => (
                      <TableRow key={ts.id} hover selected={selectedIds.has(ts.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selectedIds.has(ts.id)} onChange={() => toggleSelect(ts.id)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {ts.employee ? `${ts.employee.first_name} ${ts.employee.last_name}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(ts.week_start_date), 'MMM d, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{ts.total_hours}h</TableCell>
                        <TableCell>
                          <Chip
                            label={ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                            color={ts.status === 'approved' ? 'success' : ts.status === 'submitted' ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Reports Export + Guide */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Daily Reports</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Export all daily site reports for the selected date range as a CSV.
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<DownloadIcon />}
                  onClick={handleExportReports}
                >
                  Export Reports CSV
                </Button>
              </CardContent>
            </Card>

            <Card sx={{ bgcolor: 'grey.50' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>MYOB Import Steps</Typography>
                <Stack spacing={1}>
                  {[
                    'Download the MYOB Export CSV',
                    'Open MYOB AccountRight',
                    'Go to Payroll → Timesheets',
                    'Click Import and select the CSV file',
                    'Map columns to MYOB fields',
                    'Review and confirm the import',
                  ].map((step, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{
                        width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, mt: 0.1,
                      }}>
                        {i + 1}
                      </Box>
                      <Typography variant="body2">{step}</Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
