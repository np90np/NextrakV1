import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import EngineeringIcon from '@mui/icons-material/Engineering';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import useApi from '../lib/apiClient';
import type { Project, ProjectStatus, Employee } from '../lib/database.types';
import { format } from 'date-fns';

const statusColor: Record<ProjectStatus, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  active: 'success',
  planning: 'info',
  on_hold: 'warning',
  completed: 'default',
};

const statusLabel: Record<ProjectStatus, string> = {
  active: 'Active',
  planning: 'Planning',
  on_hold: 'On Hold',
  completed: 'Completed',
};

const emptyForm = {
  name: '',
  description: '',
  client_name: '',
  client_email: '',
  client_phone: '',
  address: '',
  city: '',
  state: '',
  postcode: '',
  cost_code: '',
  status: 'planning' as ProjectStatus,
  budget: '',
  contract_value: '',
  start_date: '',
  end_date: '',
  manager_id: '',
};

interface ProjectCosts {
  [projectId: string]: { timesheetCost: number; expenseCost: number };
}

export default function Projects() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCosts>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();

  const fetchProjectCosts = async (projectIds: string[]) => {
    if (projectIds.length === 0) return;
    try {
      const ids = projectIds.join(',');
      const data = await api.get(`/api/projects/costs?ids=${encodeURIComponent(ids)}`);
      const costs: ProjectCosts = {};
      for (const [pid, v] of Object.entries(data || {}) as [string, any][]) {
        costs[pid] = { timesheetCost: v.timesheetCost || 0, expenseCost: v.expenseCost || 0 };
      }
      setProjectCosts(costs);
    } catch (err) {
      console.error('fetchProjectCosts error', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [projectsData, employeesData] = await Promise.all([
        api.get('/api/projects'),
        api.get('/api/employees'),
      ]);
      setProjects(projectsData ?? []);
      setEmployees(employeesData ?? []);
      if ((projectsData ?? []).length > 0) {
        await fetchProjectCosts((projectsData as any[]).map((p) => p.id));
      }
    } catch (err) {
      console.error('fetchProjects error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (proj: Project) => {
    setEditing(proj);
    setForm({
      name: proj.name,
      description: proj.description,
      client_name: proj.client_name,
      client_email: proj.client_email,
      client_phone: proj.client_phone,
      address: proj.address,
      city: proj.city,
      state: proj.state,
      postcode: proj.postcode,
      cost_code: proj.cost_code ?? '',
      status: proj.status,
      budget: proj.budget.toString(),
      contract_value: proj.contract_value.toString(),
      start_date: proj.start_date ?? '',
      end_date: proj.end_date ?? '',
      manager_id: proj.manager_id ?? '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { setError('Project name is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name,
      description: form.description,
      client_name: form.client_name,
      client_email: form.client_email,
      client_phone: form.client_phone,
      address: form.address,
      city: form.city,
      state: form.state,
      postcode: form.postcode,
      cost_code: form.cost_code,
      status: form.status,
      budget: parseFloat(form.budget) || 0,
      contract_value: parseFloat(form.contract_value) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      manager_id: form.manager_id || null,
    };

    try {
      if (editing) {
        await api.put(`/api/projects/${editing.id}`, payload);
      } else {
        await api.post('/api/projects', payload);
      }
      setDialogOpen(false);
      fetchProjects();
    } catch (err: any) {
      console.error('save project error', err);
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  const getManagerName = (id: string | null) => {
    if (!id) return null;
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : null;
  };

  const skeletonCards = Array.from({ length: 6 }).map((_, i) => (
    <Grid item xs={12} sm={6} lg={4 } key={i}>
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
    </Grid>
  ));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage construction projects
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Project
        </Button>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ maxWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', 'active', 'planning', 'on_hold', 'completed'] as const).map((s) => (
            <Chip
              key={s}
              label={s === 'all' ? 'All' : statusLabel[s as ProjectStatus]}
              onClick={() => setStatusFilter(s)}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? (s === 'all' ? 'primary' : statusColor[s as ProjectStatus]) : 'default'}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {loading ? skeletonCards : filtered.length === 0 ? (
            <Grid item xs={12}>
              <Box textAlign="center" py={6}>
                <EngineeringIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  {search ? 'No projects match your search.' : 'No projects yet. Create your first project.'}
                </Typography>
              </Box>
            </Grid>
          ) : filtered.map((project) => (
            <Grid item xs={12} sm={6} lg={4 } key={project.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, mr: 1 }} noWrap>
                      {project.name}
                    </Typography>
                    <Chip
                      label={statusLabel[project.status]}
                      color={statusColor[project.status]}
                      size="small"
                    />
                  </Box>

                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </Typography>
                  )}

                  <Stack spacing={0.75}>
                    {project.client_name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{project.client_name}</Typography>
                      </Box>
                    )}
                    {(project.city || project.state) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {[project.city, project.state].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    {project.contract_value > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoneyIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          ${project.contract_value.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    {project.cost_code && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ bgcolor: 'primary.lighter', px: 1, py: 0.5, borderRadius: 1, color: 'primary.main' }}>
                          {project.cost_code}
                        </Typography>
                      </Box>
                    )}
                    {projectCosts[project.id] && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="caption" color="success.main" fontWeight={600}>
                            Labor: ${projectCosts[project.id].timesheetCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ReceiptIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="caption" color="warning.main" fontWeight={600}>
                            Expenses: ${projectCosts[project.id].expenseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      </>
                    )}
                    {project.start_date && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(project.start_date), 'MMM d, yyyy')}
                          {project.end_date && ` → ${format(new Date(project.end_date), 'MMM d, yyyy')}`}
                        </Typography>
                      </Box>
                    )}
                    {getManagerName(project.manager_id) && (
                      <Typography variant="caption" color="text.secondary">
                        PM: {getManagerName(project.manager_id)}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" startIcon={<AssignmentIcon />} onClick={() => router.push(`/reports?project=${project.id}`)}>
                    Daily Diary
                  </Button>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(project)}>
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ p: 2 }}><Skeleton height={40} /></Box>
              ))
            ) : filtered.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary">No projects found.</Typography>
              </Box>
            ) : filtered.map((project, idx) => (
              <Box key={project.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{project.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {[project.client_name, project.city, project.state].filter(Boolean).join(' • ')}
                    </Typography>
                  </Box>
                  {project.contract_value > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      ${project.contract_value.toLocaleString()}
                    </Typography>
                  )}
                  <Chip label={statusLabel[project.status]} color={statusColor[project.status]} size="small" />
                  <Tooltip title="Daily Diary">
                    <IconButton size="small" onClick={() => router.push(`/reports?project=${project.id}`)}>
                      <AssignmentIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => openEdit(project)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
                {idx < filtered.length - 1 && <Divider />}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={600}>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Project Name" required fullWidth value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={3 }>
              <TextField label="Status" select fullWidth value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                <MenuItem value="planning">Planning</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3 }>
              <TextField label="Cost Code" fullWidth value={form.cost_code}
                onChange={(e) => setForm({ ...form, cost_code: e.target.value })}
                placeholder="e.g. RSC-001" />
            </Grid>
            <Grid item xs={12} sm={3 }>
              <TextField label="Contract Value ($)" type="number" fullWidth value={form.contract_value}
                onChange={(e) => setForm({ ...form, contract_value: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={3 }>
              <TextField label="Budget ($)" type="number" fullWidth value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6 }>
              <TextField label="Start Date" type="date" fullWidth value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6 }>
              <TextField label="End Date" type="date" fullWidth value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Client Details</Typography></Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="Client Name" fullWidth value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="Client Email" type="email" fullWidth value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="Client Phone" fullWidth value={form.client_phone}
                onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Site Address</Typography></Grid>
            <Grid item xs={12}>
              <TextField label="Street Address" fullWidth value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="City/Suburb" fullWidth value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="State" fullWidth value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4 }>
              <TextField label="Postcode" fullWidth value={form.postcode}
                onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Project Manager" select fullWidth value={form.manager_id}
                onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                <MenuItem value="">— None —</MenuItem>
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {editing && projectCosts[editing.id] && (projectCosts[editing.id].timesheetCost > 0 || projectCosts[editing.id].expenseCost > 0) && (
              <>
                <Grid item xs={12}><Divider /></Grid>
                <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Current Project Costs</Typography></Grid>
                <Grid item xs={12} sm={6 }>
                  <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AttachMoneyIcon sx={{ color: 'success.main' }} />
                      <Typography variant="subtitle2" fontWeight={600} color="success.main">Labor Costs</Typography>
                    </Box>
                    <Typography variant="h6" color="success.main">
                      ${projectCosts[editing.id].timesheetCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Based on timesheet entries and employee rates</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6 }>
                  <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ReceiptIcon sx={{ color: 'warning.main' }} />
                      <Typography variant="subtitle2" fontWeight={600} color="warning.main">Material & Expenses</Typography>
                    </Box>
                    <Typography variant="h6" color="warning.main">
                      ${projectCosts[editing.id].expenseCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">From daily expense entries</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="primary.main" fontWeight={600} sx={{ mb: 1 }}>Total Current Cost</Typography>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      ${(projectCosts[editing.id].timesheetCost + projectCosts[editing.id].expenseCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
