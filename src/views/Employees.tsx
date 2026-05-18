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
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import useApi from '../lib/apiClient';
import type { Employee, EmployeeRole, EmploymentType } from '../lib/database.types';

const roleColors: Record<EmployeeRole, 'error' | 'warning' | 'default'> = {
  admin: 'error',
  manager: 'warning',
  employee: 'default',
};

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'employee' as EmployeeRole,
  position: '',
  hourly_rate: '',
  employment_type: 'full_time' as EmploymentType,
  start_date: '',
  is_active: true,
  emergency_contact_name: '',
  emergency_contact_phone: '',
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/employees');
      setEmployees(data ?? []);
    } catch (err: any) {
      console.error('fetchEmployees error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      position: emp.position,
      hourly_rate: emp.hourly_rate.toString(),
      employment_type: emp.employment_type,
      start_date: emp.start_date ?? '',
      is_active: emp.is_active,
      emergency_contact_name: emp.emergency_contact_name,
      emergency_contact_phone: emp.emergency_contact_phone,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setError('First name, last name, and email are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      position: form.position,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      employment_type: form.employment_type,
      start_date: form.start_date || null,
      is_active: form.is_active,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
    };

    try {
      if (editing) {
        await api.put(`/api/employees/${editing.id}`, payload);
      } else {
        await api.post('/api/employees', payload);
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (err: any) {
      console.error('save employee error', err);
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (emp: Employee) =>
    `${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase();

  const avatarColor = (role: EmployeeRole) =>
    role === 'admin' ? 'error.main' : role === 'manager' ? 'warning.main' : 'secondary.main';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Employees</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your workforce
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Employee
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 2 }}>
          <TextField
            placeholder="Search by name, email, or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ mb: 2, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Position</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Role</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Rate/hr</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Box textAlign="center" py={4}>
                          <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {search ? 'No employees match your search.' : 'No employees yet. Add your first employee.'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                  : filtered.map((emp) => (
                    <TableRow key={emp.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor(emp.role), fontSize: '0.75rem' }}>
                            {getInitials(emp)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {emp.first_name} {emp.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{emp.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                        <Typography variant="body2">{emp.position || '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Chip
                          label={emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                          color={roleColors[emp.role]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2">
                          {emp.hourly_rate > 0 ? `$${emp.hourly_rate.toFixed(2)}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={emp.is_active ? 'Active' : 'Inactive'}
                          color={emp.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(emp)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={600}>
          {editing ? 'Edit Employee' : 'Add Employee'}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="First Name"
                required
                fullWidth
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                required
                fullWidth
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Position/Trade"
                fullWidth
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Role"
                select
                fullWidth
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as EmployeeRole })}
              >
                <MenuItem value="employee">Employee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Employment Type"
                select
                fullWidth
                value={form.employment_type}
                onChange={(e) => setForm({ ...form, employment_type: e.target.value as EmploymentType })}
              >
                <MenuItem value="full_time">Full Time</MenuItem>
                <MenuItem value="part_time">Part Time</MenuItem>
                <MenuItem value="contractor">Contractor</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Hourly Rate ($)"
                type="number"
                fullWidth
                value={form.hourly_rate}
                onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Emergency Contact Name"
                fullWidth
                value={form.emergency_contact_name}
                onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Emergency Contact Phone"
                fullWidth
                value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    color="success"
                  />
                }
                label="Active Employee"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Employee'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
