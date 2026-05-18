import { useEffect, useState } from 'react';
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
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory2';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildIcon from '@mui/icons-material/Build';
import SpeedIcon from '@mui/icons-material/Speed';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import WarningIcon from '@mui/icons-material/Warning';
import type { Asset, AssetType, AssetCondition, AssetStatus, Project, Employee } from '../lib/database.types';
import { useAuthedFetch } from '../lib/api';

const typeColor: Record<AssetType, 'primary' | 'secondary' | 'info' | 'default'> = {
  plant: 'primary', vehicle: 'secondary', equipment: 'info', tool: 'default',
};
const typeLabel: Record<AssetType, string> = {
  plant: 'Plant', vehicle: 'Vehicle', equipment: 'Equipment', tool: 'Tool',
};
const statusColor: Record<AssetStatus, 'success' | 'warning' | 'error' | 'default'> = {
  available: 'success', in_use: 'warning', maintenance: 'error', retired: 'default',
};
const statusLabel: Record<AssetStatus, string> = {
  available: 'Available', in_use: 'In Use', maintenance: 'Maintenance', retired: 'Retired',
};
const conditionColor: Record<AssetCondition, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  new: 'success', good: 'info', fair: 'warning', poor: 'error', decommissioned: 'default',
};
const conditionLabel: Record<AssetCondition, string> = {
  new: 'New', good: 'Good', fair: 'Fair', poor: 'Poor', decommissioned: 'Decommissioned',
};

const INTERVAL_PRESETS = [
  { value: '250hr',   label: '250 hr',     interval: 250,   unit: 'hr' },
  { value: '500hr',   label: '500 hr',     interval: 500,   unit: 'hr' },
  { value: '1000hr',  label: '1,000 hr',   interval: 1000,  unit: 'hr' },
  { value: '10000km', label: '10,000 km',  interval: 10000, unit: 'km' },
];

function detectPreset(value: number | null, unit: string): string {
  if (!value) return '';
  for (const p of INTERVAL_PRESETS) {
    if (p.interval === value && p.unit === unit) return p.value;
  }
  return 'custom';
}

interface SmuStatus {
  remaining: number;
  nextDue: number;
  pct: number;        // 0–100, how much of the interval is consumed
  isOverdue: boolean;
  isDueSoon: boolean; // within 10% of interval remaining
}

function getSmuStatus(asset: Asset): SmuStatus | null {
  if (!asset.service_interval_value) return null;
  const interval = Number(asset.service_interval_value);
  const current  = Number(asset.current_smu ?? 0);
  const lastSmu  = Number(asset.last_service_smu ?? 0);
  const nextDue  = lastSmu + interval;
  const remaining = nextDue - current;
  const consumed  = current - lastSmu;
  const pct = Math.min(100, Math.max(0, (consumed / interval) * 100));
  return {
    remaining,
    nextDue,
    pct,
    isOverdue: remaining <= 0,
    isDueSoon: remaining > 0 && remaining <= interval * 0.1,
  };
}

const emptyForm = {
  name: '',
  asset_type: 'equipment' as AssetType,
  serial_number: '',
  registration: '',
  purchase_date: '',
  purchase_price: '',
  current_value: '',
  condition: 'good' as AssetCondition,
  status: 'available' as AssetStatus,
  assigned_project_id: '',
  assigned_employee_id: '',
  location: '',
  last_service_date: '',
  next_service_date: '',
  current_smu: '',
  last_service_smu: '',
  service_interval_preset: '',
  service_interval_value: '',
  service_interval_unit: 'hr',
  notes: '',
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const authedFetch = useAuthedFetch();

  const fetchData = async () => {
    setLoading(true);
    const [assetRes, projRes, empRes] = await Promise.all([
      authedFetch('/api/assets'),
      authedFetch('/api/projects'),
      authedFetch('/api/employees'),
    ]);
    setAssets(assetRes.ok ? await assetRes.json() : []);
    const projData: Project[] = projRes.ok ? await projRes.json() : [];
    const empData: Employee[] = empRes.ok ? await empRes.json() : [];
    setProjects(projData.filter((p) => p.status === 'active'));
    setEmployees(empData.filter((e) => e.is_active));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.name.toLowerCase().includes(q) ||
      (a.serial_number ?? '').toLowerCase().includes(q) ||
      (a.registration ?? '').toLowerCase().includes(q) ||
      (a.location ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || a.asset_type === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      asset_type: asset.asset_type,
      serial_number: asset.serial_number ?? '',
      registration: asset.registration ?? '',
      purchase_date: asset.purchase_date ?? '',
      purchase_price: (asset.purchase_price ?? 0).toString(),
      current_value: (asset.current_value ?? 0).toString(),
      condition: asset.condition,
      status: asset.status,
      assigned_project_id: asset.assigned_project_id ?? '',
      assigned_employee_id: asset.assigned_employee_id ?? '',
      location: asset.location ?? '',
      last_service_date: asset.last_service_date ?? '',
      next_service_date: asset.next_service_date ?? '',
      current_smu: (asset.current_smu ?? 0).toString(),
      last_service_smu: (asset.last_service_smu ?? 0).toString(),
      service_interval_preset: detectPreset(asset.service_interval_value, asset.service_interval_unit ?? 'hr'),
      service_interval_value: asset.service_interval_value ? asset.service_interval_value.toString() : '',
      service_interval_unit: asset.service_interval_unit ?? 'hr',
      notes: asset.notes ?? '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handlePresetChange = (preset: string) => {
    const found = INTERVAL_PRESETS.find((p) => p.value === preset);
    if (found) {
      setForm((f) => ({ ...f, service_interval_preset: preset, service_interval_value: found.interval.toString(), service_interval_unit: found.unit }));
    } else {
      setForm((f) => ({ ...f, service_interval_preset: preset }));
    }
  };

  const handleSave = async () => {
    if (!form.name) { setError('Asset name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      asset_type: form.asset_type,
      serial_number: form.serial_number,
      registration: form.registration,
      purchase_date: form.purchase_date || null,
      purchase_price: parseFloat(form.purchase_price) || 0,
      current_value: parseFloat(form.current_value) || 0,
      condition: form.condition,
      status: form.status,
      assigned_project_id: form.assigned_project_id || null,
      assigned_employee_id: form.assigned_employee_id || null,
      location: form.location,
      last_service_date: form.last_service_date || null,
      next_service_date: form.next_service_date || null,
      current_smu: parseFloat(form.current_smu) || 0,
      last_service_smu: parseFloat(form.last_service_smu) || 0,
      service_interval_value: parseFloat(form.service_interval_value) || null,
      service_interval_unit: form.service_interval_unit || 'hr',
      notes: form.notes,
    };
    const res = editing
      ? await authedFetch(`/api/assets/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await authedFetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.error ?? 'Failed to save asset'); return; }
    setDialogOpen(false);
    fetchData();
  };

  const totalValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
  const overdueCount = assets.filter((a) => getSmuStatus(a)?.isOverdue).length;

  const smuLabel = (asset: Asset) => {
    const unit = asset.service_interval_unit ?? 'hr';
    const val = Number(asset.current_smu ?? 0);
    return val > 0 ? `${val.toLocaleString()} ${unit}` : '—';
  };

  const intervalLabel = (asset: Asset) => {
    if (!asset.service_interval_value) return '—';
    return `${Number(asset.service_interval_value).toLocaleString()} ${asset.service_interval_unit ?? 'hr'}`;
  };

  const nextServiceLabel = (asset: Asset) => {
    const s = getSmuStatus(asset);
    if (!s) return '—';
    const unit = asset.service_interval_unit ?? 'hr';
    if (s.isOverdue) return `Overdue ${Math.abs(Math.round(s.remaining)).toLocaleString()} ${unit}`;
    return `In ${Math.round(s.remaining).toLocaleString()} ${unit}`;
  };

  const nextServiceColor = (asset: Asset): 'error' | 'warning' | 'success' | 'text.secondary' => {
    const s = getSmuStatus(asset);
    if (!s) return 'text.secondary';
    if (s.isOverdue) return 'error';
    if (s.isDueSoon) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Assets</Typography>
          <Typography variant="body2" color="text.secondary">Plant, vehicles, equipment and tools</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Asset</Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Assets', value: assets.length, color: 'text.primary' },
          { label: 'Total Value', value: `$${totalValue.toLocaleString()}`, color: 'text.primary' },
          { label: 'In Use', value: assets.filter(a => a.status === 'in_use').length, color: 'text.primary' },
          { label: 'Service Overdue', value: overdueCount, color: overdueCount > 0 ? 'error.main' : 'text.primary' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={s.label === 'Service Overdue' && overdueCount > 0 ? { borderColor: 'error.main', border: '1px solid' } : {}}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                  {s.label === 'Service Overdue' && overdueCount > 0 && <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                </Box>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search assets..." value={search}
          onChange={(e) => setSearch(e.target.value)} size="small" sx={{ maxWidth: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', 'plant', 'vehicle', 'equipment', 'tool'] as const).map((t) => (
            <Chip key={t} label={t === 'all' ? 'All Types' : typeLabel[t as AssetType]}
              onClick={() => setTypeFilter(t)} size="small"
              variant={typeFilter === t ? 'filled' : 'outlined'}
              color={typeFilter === t ? (t === 'all' ? 'primary' : typeColor[t as AssetType]) : 'default'} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', 'available', 'in_use', 'maintenance', 'retired'] as const).map((s) => (
            <Chip key={s} label={s === 'all' ? 'All Status' : statusLabel[s as AssetStatus]}
              onClick={() => setStatusFilter(s)} size="small"
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? (s === 'all' ? 'primary' : statusColor[s as AssetStatus]) : 'default'} />
          ))}
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'list' ? (
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Status</TableCell>
                    <TableCell align="right">Current SMU/ODO</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Service Interval</TableCell>
                    <TableCell align="right">Next Service</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Progress</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                        </TableRow>
                      ))
                    : filtered.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Box textAlign="center" py={4}>
                            <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              {search ? 'No assets match your search.' : 'No assets yet.'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                    : filtered.map((asset) => {
                      const s = getSmuStatus(asset);
                      const color = nextServiceColor(asset);
                      return (
                        <TableRow key={asset.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{asset.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {[asset.registration, asset.serial_number].filter(Boolean).join(' · ') || asset.location}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Chip label={typeLabel[asset.asset_type]} color={typeColor[asset.asset_type]} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Chip label={statusLabel[asset.status]} color={statusColor[asset.status]} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              <SpeedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                              <Typography variant="body2">{smuLabel(asset)}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="body2" color="text.secondary">{intervalLabel(asset)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            {s ? (
                              <Tooltip title={`Due at ${s.nextDue.toLocaleString()} ${asset.service_interval_unit ?? 'hr'}`}>
                                <Typography variant="body2" fontWeight={600}
                                  color={color === 'text.secondary' ? undefined : color}
                                  sx={color !== 'text.secondary' ? { color } : {}}>
                                  {nextServiceLabel(asset)}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, minWidth: 120 }}>
                            {s ? (
                              <Tooltip title={`${Math.round(s.pct)}% of interval consumed`}>
                                <LinearProgress
                                  variant="determinate" value={s.pct}
                                  color={s.isOverdue ? 'error' : s.isDueSoon ? 'warning' : 'success'}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Tooltip>
                            ) : null}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEdit(asset)}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        /* ── GRID VIEW ──────────────────────────────────────────────────────── */
        <Grid container spacing={2}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} lg={4} key={i}>
                  <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            : filtered.length === 0
            ? (
              <Grid item xs={12}>
                <Box textAlign="center" py={6}>
                  <InventoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">No assets found.</Typography>
                </Box>
              </Grid>
            )
            : filtered.map((asset) => {
              const s = getSmuStatus(asset);
              const color = nextServiceColor(asset);
              return (
                <Grid item xs={12} sm={6} lg={4} key={asset.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 2.5, flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, mr: 1 }} noWrap>{asset.name}</Typography>
                        <Chip label={statusLabel[asset.status]} color={statusColor[asset.status]} size="small" />
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                        <Chip label={typeLabel[asset.asset_type]} color={typeColor[asset.asset_type]} size="small" variant="outlined" />
                        <Chip label={conditionLabel[asset.condition]} color={conditionColor[asset.condition]} size="small" variant="outlined" />
                      </Box>

                      {/* SMU status alert */}
                      {s && (s.isOverdue || s.isDueSoon) && (
                        <Alert severity={s.isOverdue ? 'error' : 'warning'} sx={{ py: 0, mb: 1.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                          {nextServiceLabel(asset)}
                        </Alert>
                      )}

                      {/* SMU progress bar */}
                      {s && (
                        <Box sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              SMU: {Number(asset.current_smu ?? 0).toLocaleString()} {asset.service_interval_unit}
                            </Typography>
                            <Typography variant="caption" fontWeight={600}
                              color={color === 'text.secondary' ? undefined : color}
                              sx={color !== 'text.secondary' ? { color } : {}}>
                              {nextServiceLabel(asset)}
                            </Typography>
                          </Box>
                          <Tooltip title={`${Math.round(s.pct)}% of ${intervalLabel(asset)} interval consumed`}>
                            <LinearProgress
                              variant="determinate" value={s.pct}
                              color={s.isOverdue ? 'error' : s.isDueSoon ? 'warning' : 'success'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary">
                            Interval: {intervalLabel(asset)} · Due at {s.nextDue.toLocaleString()} {asset.service_interval_unit}
                          </Typography>
                        </Box>
                      )}

                      <Stack spacing={0.5}>
                        {asset.registration && <Typography variant="caption" color="text.secondary">Reg: {asset.registration}</Typography>}
                        {asset.serial_number && <Typography variant="caption" color="text.secondary">S/N: {asset.serial_number}</Typography>}
                        {asset.location && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary" noWrap>{asset.location}</Typography>
                          </Box>
                        )}
                        {asset.project?.name && <Typography variant="caption" color="text.secondary">Project: {asset.project.name}</Typography>}
                        {asset.employee && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{asset.employee.first_name} {asset.employee.last_name}</Typography>
                          </Box>
                        )}
                        {Number(asset.current_value) > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoneyIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">${Number(asset.current_value).toLocaleString()}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(asset)}>Edit</Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      )}

      {/* ── DIALOG ──────────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={600}>{editing ? 'Edit Asset' : 'New Asset'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            {/* Basic info */}
            <Grid item xs={12} sm={8}>
              <TextField label="Asset Name" required fullWidth value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Type" select fullWidth value={form.asset_type}
                onChange={(e) => setForm({ ...form, asset_type: e.target.value as AssetType })}>
                <MenuItem value="plant">Plant</MenuItem>
                <MenuItem value="vehicle">Vehicle</MenuItem>
                <MenuItem value="equipment">Equipment</MenuItem>
                <MenuItem value="tool">Tool</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Serial Number" fullWidth value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Registration" fullWidth value={form.registration}
                onChange={(e) => setForm({ ...form, registration: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Condition" select fullWidth value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value as AssetCondition })}>
                {Object.entries(conditionLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Status" select fullWidth value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}>
                {Object.entries(statusLabel).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Location" fullWidth value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Grid>

            {/* Financial */}
            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Financial</Typography></Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Purchase Date" type="date" fullWidth value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Purchase Price" type="number" fullWidth value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Current Value" type="number" fullWidth value={form.current_value}
                onChange={(e) => setForm({ ...form, current_value: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            </Grid>

            {/* Assignment */}
            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Assignment</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Assigned Project" select fullWidth value={form.assigned_project_id}
                onChange={(e) => setForm({ ...form, assigned_project_id: e.target.value })}>
                <MenuItem value="">— None —</MenuItem>
                {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Assigned Employee" select fullWidth value={form.assigned_employee_id}
                onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}>
                <MenuItem value="">— None —</MenuItem>
                {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>)}
              </TextField>
            </Grid>

            {/* Service dates */}
            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Service Dates</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Last Service Date" type="date" fullWidth value={form.last_service_date}
                onChange={(e) => setForm({ ...form, last_service_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Next Service Date" type="date" fullWidth value={form.next_service_date}
                onChange={(e) => setForm({ ...form, next_service_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>

            {/* SMU / Service Interval */}
            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>SMU / Odometer Tracking</Typography></Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Current SMU / ODO" type="number" fullWidth value={form.current_smu}
                onChange={(e) => setForm({ ...form, current_smu: e.target.value })}
                helperText="Auto-updated by prestart checklist"
                InputProps={{ endAdornment: <InputAdornment position="end">{form.service_interval_unit}</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Last Service SMU / ODO" type="number" fullWidth value={form.last_service_smu}
                onChange={(e) => setForm({ ...form, last_service_smu: e.target.value })}
                helperText="Reading when last service was done"
                InputProps={{ endAdornment: <InputAdornment position="end">{form.service_interval_unit}</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Service Interval" select fullWidth value={form.service_interval_preset}
                onChange={(e) => handlePresetChange(e.target.value)}>
                <MenuItem value="">— None —</MenuItem>
                {INTERVAL_PRESETS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                <MenuItem value="custom">Custom…</MenuItem>
              </TextField>
            </Grid>
            {form.service_interval_preset === 'custom' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField label="Interval Value" type="number" fullWidth value={form.service_interval_value}
                    onChange={(e) => setForm({ ...form, service_interval_value: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Unit" select fullWidth value={form.service_interval_unit}
                    onChange={(e) => setForm({ ...form, service_interval_unit: e.target.value })}>
                    <MenuItem value="hr">Hours (hr)</MenuItem>
                    <MenuItem value="km">Kilometres (km)</MenuItem>
                  </TextField>
                </Grid>
              </>
            )}
            {/* Live next-service preview */}
            {form.service_interval_value && form.current_smu !== '' && (
              <Grid item xs={12}>
                {(() => {
                  const interval = parseFloat(form.service_interval_value) || 0;
                  const lastSmu  = parseFloat(form.last_service_smu) || 0;
                  const current  = parseFloat(form.current_smu) || 0;
                  const nextDue  = lastSmu + interval;
                  const remaining = nextDue - current;
                  const unit = form.service_interval_unit;
                  return (
                    <Alert severity={remaining <= 0 ? 'error' : remaining <= interval * 0.1 ? 'warning' : 'success'} icon={<BuildIcon />}>
                      Next service due at <strong>{nextDue.toLocaleString()} {unit}</strong>
                      {' · '}
                      {remaining <= 0
                        ? <strong>Overdue by {Math.abs(Math.round(remaining)).toLocaleString()} {unit}</strong>
                        : <><strong>{Math.round(remaining).toLocaleString()} {unit}</strong> remaining</>}
                    </Alert>
                  );
                })()}
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField label="Notes" fullWidth multiline rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Asset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
