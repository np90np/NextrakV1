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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import EngineeringIcon from '@mui/icons-material/Engineering';
import type { MachineChecklist, ChecklistItem, ChecklistStatus, Employee, Project, Asset } from '../lib/database.types';
import { format } from 'date-fns';
import { useAuthedFetch } from '../lib/api';

const statusColor: Record<ChecklistStatus, 'default' | 'warning' | 'error'> = {
  draft: 'default',
  submitted: 'warning',
  flagged: 'error',
};

const defaultChecklistItems: ChecklistItem[] = [
  { category: 'Engine / Fluids', item: 'Engine oil level', status: 'na', comment: '' },
  { category: 'Engine / Fluids', item: 'Coolant level', status: 'na', comment: '' },
  { category: 'Engine / Fluids', item: 'Hydraulic fluid level', status: 'na', comment: '' },
  { category: 'Engine / Fluids', item: 'Fuel level', status: 'na', comment: '' },
  { category: 'Engine / Fluids', item: 'Engine starts and runs smoothly', status: 'na', comment: '' },
  { category: 'Safety', item: 'Seatbelt functional', status: 'na', comment: '' },
  { category: 'Safety', item: 'Horn operational', status: 'na', comment: '' },
  { category: 'Safety', item: 'Lights and indicators working', status: 'na', comment: '' },
  { category: 'Safety', item: 'Mirrors intact and clean', status: 'na', comment: '' },
  { category: 'Safety', item: 'Fire extinguisher present and current', status: 'na', comment: '' },
  { category: 'Safety', item: 'ROPS/FOPS structure intact', status: 'na', comment: '' },
  { category: 'Safety', item: 'Reversing alarm operational', status: 'na', comment: '' },
  { category: 'Tyres / Tracks', item: 'Tyre condition and pressure', status: 'na', comment: '' },
  { category: 'Tyres / Tracks', item: 'Wheel nuts tight', status: 'na', comment: '' },
  { category: 'Hydraulics', item: 'No visible leaks', status: 'na', comment: '' },
  { category: 'Hydraulics', item: 'Boom/bucket/bucket teeth condition', status: 'na', comment: '' },
  { category: 'Hydraulics', item: 'Hydraulic hoses condition', status: 'na', comment: '' },
  { category: 'General', item: 'Guards and covers in place', status: 'na', comment: '' },
  { category: 'General', item: 'Cab clean and free of debris', status: 'na', comment: '' },
  { category: 'General', item: 'No abnormal noises', status: 'na', comment: '' },
];

const emptyForm = {
  project_id: '',
  inspected_by: '',
  inspection_date: format(new Date(), 'yyyy-MM-dd'),
  machine_name: '',
  machine_id_number: '',
  asset_id: '',
  category: '',
  hours_reading: '',
  notes: '',
};

export default function MachineChecklists() {
  const [checklists, setChecklists] = useState<MachineChecklist[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MachineChecklist | null>(null);
  const [viewing, setViewing] = useState<MachineChecklist | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState<ChecklistItem[]>([...defaultChecklistItems]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const authedFetch = useAuthedFetch();

  const fetchAll = async () => {
    setLoading(true);
    const [clRes, empRes, projRes, assetRes] = await Promise.all([
      authedFetch('/api/machine-checklists'),
      authedFetch('/api/employees'),
      authedFetch('/api/projects'),
      authedFetch('/api/assets'),
    ]);
    const clData: MachineChecklist[] = clRes.ok ? await clRes.json() : [];
    const empData: Employee[] = empRes.ok ? await empRes.json() : [];
    const projData: Project[] = projRes.ok ? await projRes.json() : [];
    const assetData: Asset[] = assetRes.ok ? await assetRes.json() : [];
    setChecklists(clData);
    setEmployees(empData.filter((e) => e.is_active));
    setProjects(projData.filter((p) => p.status === 'active' || p.status === 'planning'));
    setAssets(assetData.filter((a) => a.status === 'available' || a.status === 'in_use' || a.status === 'maintenance'));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = checklists.filter((cl) => {
    const q = search.toLowerCase();
    return (
      cl.machine_name.toLowerCase().includes(q) ||
      cl.machine_id_number?.toLowerCase().includes(q) ||
      cl.category?.toLowerCase().includes(q) ||
      cl.project?.name?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setItems([...defaultChecklistItems]);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (cl: MachineChecklist) => {
    setEditing(cl);
    setForm({
      project_id: cl.project_id,
      inspected_by: cl.inspected_by,
      inspection_date: cl.inspection_date,
      machine_name: cl.machine_name,
      machine_id_number: cl.machine_id_number,
      asset_id: cl.asset_id || '',
      category: cl.category || '',
      hours_reading: cl.hours_reading.toString(),
      notes: cl.notes,
    });
    setItems(Array.isArray(cl.items) ? cl.items : [...defaultChecklistItems]);
    setError('');
    setDialogOpen(true);
  };

  const openView = (cl: MachineChecklist) => {
    setViewing(cl);
    setViewDialogOpen(true);
  };

  const updateItemStatus = (index: number, status: 'ok' | 'fault' | 'na') => {
    const updated = [...items];
    updated[index] = { ...updated[index], status };
    setItems(updated);
  };

  const updateItemComment = (index: number, comment: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], comment };
    setItems(updated);
  };

  const handleSave = async () => {
    if (!form.project_id || !form.inspected_by || !form.inspection_date || !form.machine_name) {
      setError('Project, inspector, date, and machine name are required.');
      return;
    }
    setSaving(true);
    setError('');

    const hasFaults = items.some((i) => i.status === 'fault');
    const payload = {
      project_id: form.project_id,
      inspected_by: form.inspected_by,
      inspection_date: form.inspection_date,
      machine_name: form.machine_name,
      machine_id_number: form.machine_id_number,
      asset_id: form.asset_id || null,
      category: form.category || null,
      hours_reading: parseFloat(form.hours_reading) || 0,
      status: hasFaults ? 'flagged' : 'submitted',
      items: items,
      notes: form.notes,
    };

    const res = editing
      ? await authedFetch(`/api/machine-checklists/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await authedFetch('/api/machine-checklists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to save checklist');
      return;
    }
    setDialogOpen(false);
    fetchAll();
  };

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Machine Prestart Checklists</Typography>
          <Typography variant="body2" color="text.secondary">
            Complete safety inspections before operating plant and machinery
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Checklist
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 2 }}>
          <TextField
            placeholder="Search by machine, ID, or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ mb: 2, maxWidth: 360 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
            }}
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Machine</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Project</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Inspector</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Box sx={{ height: 20, bgcolor: 'grey.100', borderRadius: 1 }} /></TableCell>)}</TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box textAlign="center" py={4}>
                        <EngineeringIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No checklists found.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((cl) => (
                  <TableRow key={cl.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{format(new Date(cl.inspection_date), 'MMM d, yyyy')}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{cl.machine_name}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Typography variant="body2">{cl.category || '—'}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography variant="body2">{cl.project?.name ?? '—'}</Typography></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Typography variant="body2">{cl.inspector ? `${cl.inspector.first_name} ${cl.inspector.last_name}` : '—'}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={cl.status.charAt(0).toUpperCase() + cl.status.slice(1)}
                        color={statusColor[cl.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View"><IconButton size="small" onClick={() => openView(cl)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(cl)}><EditIcon fontSize="small" /></IconButton></Tooltip>
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
        <DialogTitle fontWeight={600}>{editing ? 'Edit Checklist' : 'New Prestart Checklist'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField label="Project" select required fullWidth value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                {projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Inspected By" select required fullWidth value={form.inspected_by}
                onChange={(e) => setForm({ ...form, inspected_by: e.target.value })}>
                {employees.map((e) => <MenuItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Inspection Date" type="date" required fullWidth value={form.inspection_date}
                onChange={(e) => setForm({ ...form, inspection_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Category" select fullWidth value={form.category}
                onChange={(e) => {
                  setForm({ ...form, category: e.target.value, asset_id: '' });
                }}>
                <MenuItem value="">Select Category</MenuItem>
                {Array.from(new Set(assets.map(a => a.asset_type))).map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Machine (Asset)" select required fullWidth value={form.asset_id}
                onChange={(e) => {
                  const asset = assets.find(a => a.id === e.target.value);
                  setForm({ ...form, asset_id: e.target.value, machine_name: asset?.name || form.machine_name });
                }}>
                <MenuItem value="">Select Machine</MenuItem>
                {assets
                  .filter(a => !form.category || a.asset_type === form.category)
                  .map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>{asset.name}</MenuItem>
                  ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Hours Reading" type="number" fullWidth value={form.hours_reading}
                onChange={(e) => setForm({ ...form, hours_reading: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Checklist Items</Typography>
          {categories.map((cat) => (
            <Box key={cat} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 0.5 }}>{cat}</Typography>
              {items
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => item.category === cat)
                .map(({ item, idx }) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, px: 1,
                      borderRadius: 1, mb: 0.5,
                      bgcolor: item.status === 'fault' ? 'error.50' : item.status === 'ok' ? 'success.50' : 'transparent',
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{item.item}</Typography>
                    <ToggleButtonGroup
                      size="small"
                      value={item.status}
                      exclusive
                      onChange={(_, v) => v && updateItemStatus(idx, v)}
                    >
                      <ToggleButton value="ok" sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>OK</ToggleButton>
                      <ToggleButton value="fault" sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>Fault</ToggleButton>
                      <ToggleButton value="na" sx={{ px: 1.5, py: 0.25, fontSize: '0.7rem' }}>N/A</ToggleButton>
                    </ToggleButtonGroup>
                    {item.status === 'fault' && (
                      <TextField
                        size="small"
                        placeholder="Describe fault..."
                        value={item.comment}
                        onChange={(e) => updateItemComment(idx, e.target.value)}
                        sx={{ minWidth: 160 }}
                      />
                    )}
                  </Box>
                ))}
            </Box>
          ))}

          <TextField
            label="Additional Notes"
            multiline
            rows={2}
            fullWidth
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Submit Checklist'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        {viewing && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>{viewing.machine_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(viewing.inspection_date), 'EEEE, MMMM d, yyyy')}
                    {viewing.category && ` • Category: ${viewing.category}`}
                    {viewing.machine_id_number && ` • ID: ${viewing.machine_id_number}`}
                  </Typography>
                </Box>
                <Chip
                  label={viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)}
                  color={statusColor[viewing.status]}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Project</Typography><Typography variant="body2" fontWeight={600}>{viewing.project?.name ?? '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Inspector</Typography><Typography variant="body2" fontWeight={600}>{viewing.inspector ? `${viewing.inspector.first_name} ${viewing.inspector.last_name}` : '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption" color="text.secondary">Hours</Typography><Typography variant="body2" fontWeight={600}>{viewing.hours_reading || '—'}</Typography></Grid>
              </Grid>

              {categories.map((cat) => (
                <Box key={cat} sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight={600}>{cat}</Typography>
                  {(Array.isArray(viewing.items) ? viewing.items : [])
                    .filter((i: ChecklistItem) => i.category === cat)
                    .map((item: ChecklistItem, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1 }}>
                        {item.status === 'ok' && <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18 }} />}
                        {item.status === 'fault' && <WarningIcon sx={{ color: 'error.main', fontSize: 18 }} />}
                        {item.status === 'na' && <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid', borderColor: 'grey.400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'grey.500' }}>—</Box>}
                        <Typography variant="body2" sx={{ flex: 1 }}>{item.item}</Typography>
                        {item.status === 'fault' && item.comment && (
                          <Typography variant="caption" color="error.main">{item.comment}</Typography>
                        )}
                      </Box>
                    ))}
                </Box>
              ))}

              {viewing.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600}>Notes</Typography>
                  <Typography variant="body2">{viewing.notes}</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => { setViewDialogOpen(false); openEdit(viewing); }}>Edit</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
