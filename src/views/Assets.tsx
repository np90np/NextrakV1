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
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
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
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import WarningIcon from '@mui/icons-material/Warning';
import type { Asset, AssetType, AssetCondition, AssetStatus, Project, Employee } from '../lib/database.types';
import { format, differenceInDays } from 'date-fns';
import { useAuthedFetch } from '../lib/api';

const typeColor: Record<AssetType, 'primary' | 'secondary' | 'info' | 'default'> = {
  plant: 'primary',
  vehicle: 'secondary',
  equipment: 'info',
  tool: 'default',
};

const typeLabel: Record<AssetType, string> = {
  plant: 'Plant',
  vehicle: 'Vehicle',
  equipment: 'Equipment',
  tool: 'Tool',
};

const statusColor: Record<AssetStatus, 'success' | 'warning' | 'error' | 'default'> = {
  available: 'success',
  in_use: 'warning',
  maintenance: 'error',
  retired: 'default',
};

const statusLabel: Record<AssetStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

const conditionColor: Record<AssetCondition, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  new: 'success',
  good: 'info',
  fair: 'warning',
  poor: 'error',
  decommissioned: 'default',
};

const conditionLabel: Record<AssetCondition, string> = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  decommissioned: 'Decommissioned',
};

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    const assetData: Asset[] = assetRes.ok ? await assetRes.json() : [];
    const projData: Project[] = projRes.ok ? await projRes.json() : [];
    const empData: Employee[] = empRes.ok ? await empRes.json() : [];
    setAssets(assetData);
    setProjects(projData.filter((p) => p.status === 'active'));
    setEmployees(empData.filter((e) => e.is_active));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.name.toLowerCase().includes(q) ||
      a.serial_number.toLowerCase().includes(q) ||
      a.registration.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || a.asset_type === typeFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const serviceDueSoon = (a: Asset) => {
    if (!a.next_service_date) return false;
    const daysUntil = differenceInDays(new Date(a.next_service_date), new Date());
    return daysUntil <= 14 && daysUntil >= 0;
  };

  const serviceOverdue = (a: Asset) => {
    if (!a.next_service_date) return false;
    return differenceInDays(new Date(a.next_service_date), new Date()) < 0;
  };

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
      serial_number: asset.serial_number,
      registration: asset.registration,
      purchase_date: asset.purchase_date ?? '',
      purchase_price: asset.purchase_price.toString(),
      current_value: asset.current_value.toString(),
      condition: asset.condition,
      status: asset.status,
      assigned_project_id: asset.assigned_project_id ?? '',
      assigned_employee_id: asset.assigned_employee_id ?? '',
      location: asset.location,
      last_service_date: asset.last_service_date ?? '',
      next_service_date: asset.next_service_date ?? '',
      notes: asset.notes,
    });
    setError('');
    setDialogOpen(true);
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
      notes: form.notes,
    };

    const res = editing
      ? await authedFetch(`/api/assets/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await authedFetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to save asset');
      return;
    }
    setDialogOpen(false);
    fetchData();
  };

  const totalValue = assets.reduce((sum, a) => sum + a.current_value, 0);
  const overdueCount = assets.filter(serviceOverdue).length;

  const skeletonCards = Array.from({ length: 6 }).map((_, i) => (
    <Grid item xs={12} sm={6} lg={4} key={i}>
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
    </Grid>
  ));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Assets</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage plant, vehicles, equipment, and tools
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Asset
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" color="text.secondary">Total Assets</Typography>
              <Typography variant="h5" fontWeight={700}>{assets.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" color="text.secondary">Total Value</Typography>
              <Typography variant="h5" fontWeight={700}>${totalValue.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" color="text.secondary">In Use</Typography>
              <Typography variant="h5" fontWeight={700}>{assets.filter(a => a.status === 'in_use').length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={overdueCount > 0 ? { borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' } : {}}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Service Overdue</Typography>
                {overdueCount > 0 && <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />}
              </Box>
              <Typography variant="h5" fontWeight={700} color={overdueCount > 0 ? 'error.main' : 'text.primary'}>
                {overdueCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search assets..."
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
          {(['all', 'plant', 'vehicle', 'equipment', 'tool'] as const).map((t) => (
            <Chip
              key={t}
              label={t === 'all' ? 'All Types' : typeLabel[t as AssetType]}
              onClick={() => setTypeFilter(t)}
              variant={typeFilter === t ? 'filled' : 'outlined'}
              color={typeFilter === t ? (t === 'all' ? 'primary' : typeColor[t as AssetType]) : 'default'}
              size="small"
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {(['all', 'available', 'in_use', 'maintenance', 'retired'] as const).map((s) => (
            <Chip
              key={s}
              label={s === 'all' ? 'All Status' : statusLabel[s as AssetStatus]}
              onClick={() => setStatusFilter(s)}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? (s === 'all' ? 'primary' : statusColor[s as AssetStatus]) : 'default'}
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
                <InventoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  {search ? 'No assets match your search.' : 'No assets yet. Add your first asset.'}
                </Typography>
              </Box>
            </Grid>
          ) : filtered.map((asset) => (
            <Grid item xs={12} sm={6} lg={4} key={asset.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, mr: 1 }} noWrap>
                      {asset.name}
                    </Typography>
                    <Chip
                      label={statusLabel[asset.status]}
                      color={statusColor[asset.status]}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <Chip label={typeLabel[asset.asset_type]} color={typeColor[asset.asset_type]} size="small" variant="outlined" />
                    <Chip label={conditionLabel[asset.condition]} color={conditionColor[asset.condition]} size="small" variant="outlined" />
                  </Box>

                  {(serviceOverdue(asset) || serviceDueSoon(asset)) && (
                    <Alert
                      severity={serviceOverdue(asset) ? 'error' : 'warning'}
                      sx={{ py: 0, mb: 1.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                    >
                      {serviceOverdue(asset)
                        ? `Service overdue by ${Math.abs(differenceInDays(new Date(asset.next_service_date!), new Date()))} days`
                        : `Service due in ${differenceInDays(new Date(asset.next_service_date!), new Date())} days`}
                    </Alert>
                  )}

                  <Stack spacing={0.75}>
                    {asset.registration && (
                      <Typography variant="caption" color="text.secondary">
                        Reg: {asset.registration}
                      </Typography>
                    )}
                    {asset.serial_number && (
                      <Typography variant="caption" color="text.secondary">
                        S/N: {asset.serial_number}
                      </Typography>
                    )}
                    {asset.location && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>{asset.location}</Typography>
                      </Box>
                    )}
                    {asset.project?.name && (
                      <Typography variant="caption" color="text.secondary">
                        Project: {asset.project.name}
                      </Typography>
                    )}
                    {asset.employee && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {asset.employee.first_name} {asset.employee.last_name}
                        </Typography>
                      </Box>
                    )}
                    {asset.current_value > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoneyIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          ${asset.current_value.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    {asset.next_service_date && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BuildIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          Next service: {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(asset)}>
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
                <Typography variant="body2" color="text.secondary">No assets found.</Typography>
              </Box>
            ) : filtered.map((asset, idx) => (
              <Box key={asset.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{asset.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {[typeLabel[asset.asset_type], asset.registration, asset.location].filter(Boolean).join(' • ')}
                    </Typography>
                  </Box>
                  {asset.current_value > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                      ${asset.current_value.toLocaleString()}
                    </Typography>
                  )}
                  <Chip label={conditionLabel[asset.condition]} color={conditionColor[asset.condition]} size="small" />
                  <Chip label={statusLabel[asset.status]} color={statusColor[asset.status]} size="small" />
                  <IconButton size="small" onClick={() => openEdit(asset)}>
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
        <DialogTitle fontWeight={600}>{editing ? 'Edit Asset' : 'New Asset'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
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
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="good">Good</MenuItem>
                <MenuItem value="fair">Fair</MenuItem>
                <MenuItem value="poor">Poor</MenuItem>
                <MenuItem value="decommissioned">Decommissioned</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Status" select fullWidth value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="in_use">In Use</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="retired">Retired</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Location" fullWidth value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Financial</Typography></Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Purchase Date" type="date" fullWidth value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
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

            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Assignment</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Assigned Project" select fullWidth value={form.assigned_project_id}
                onChange={(e) => setForm({ ...form, assigned_project_id: e.target.value })}>
                <MenuItem value="">-- None --</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Assigned Employee" select fullWidth value={form.assigned_employee_id}
                onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}>
                <MenuItem value="">-- None --</MenuItem>
                {employees.map((e) => (
                  <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary">Service</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Last Service Date" type="date" fullWidth value={form.last_service_date}
                onChange={(e) => setForm({ ...form, last_service_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Next Service Date" type="date" fullWidth value={form.next_service_date}
                onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>

            <Grid item xs={12}>
              <TextField label="Notes" fullWidth multiline rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Asset'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
