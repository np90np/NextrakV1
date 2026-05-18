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
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import useApi from '../lib/apiClient';
import type { Project } from '../lib/database.types';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  projects: number;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const api = useApi();
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const projects = await api.get('/api/projects');
      if (projects) {
        const clientMap = new Map<string, { name: string; email: string; phone: string; projects: number }>();
        projects.forEach((proj: Project) => {
          if (proj.client_name) {
            const key = proj.client_name.toLowerCase();
            if (clientMap.has(key)) {
              const client = clientMap.get(key)!;
              client.projects += 1;
            } else {
              clientMap.set(key, {
                name: proj.client_name,
                email: proj.client_email || '',
                phone: proj.client_phone || '',
                projects: 1,
              });
            }
          }
        });

        const uniqueClients: Client[] = Array.from(clientMap.entries()).map(([_, client], idx) => ({
          id: `client-${idx}`,
          ...client,
        }));

        setClients(uniqueClients.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error('fetchClients error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      setError('Client name is required.');
      return;
    }
    setSaving(true);
    setError('');

    try {

      if (editing) {
        const projects = await api.get(`/api/projects`);
        const matches = (projects || []).filter((p: Project) => p.client_name === editing.name);
        if (matches.length > 0) {
          await Promise.all(
            matches.map((proj: Project) => api.put(`/api/projects/${proj.id}`, {
              client_name: form.name,
              client_email: form.email,
              client_phone: form.phone,
            }))
          );
        }
      }

      setDialogOpen(false);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    setSaving(true);
    try {
      const projects = await api.get('/api/projects');
      const matches = (projects || []).filter((p: Project) => p.client_name === client.name);
      if (matches.length > 0) {
        await Promise.all(
          matches.map((proj: Project) => api.put(`/api/projects/${proj.id}`, { client_name: '', client_email: '', client_phone: '' }))
        );
      }

      setDeleteConfirm(null);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
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
          <Typography variant="h5" fontWeight={700}>Clients</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage client information and contacts
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Client
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ maxWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {loading ? (
          skeletonCards
        ) : filtered.length === 0 ? (
          <Grid item xs={12}>
            <Box textAlign="center" py={6}>
              <BusinessIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                {search ? 'No clients match your search.' : 'No clients yet.'}
              </Typography>
            </Box>
          </Grid>
        ) : (
          filtered.map((client) => (
            <Grid item xs={12} sm={6} lg={4 } key={client.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ p: 2.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, mr: 1 }}>
                      {client.name}
                    </Typography>
                    <Chip label={`${client.projects} project${client.projects !== 1 ? 's' : ''}`} size="small" variant="outlined" />
                  </Box>

                  <Stack spacing={0.75}>
                    {client.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                          {client.email}
                        </Typography>
                      </Box>
                    )}
                    {client.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {client.phone}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
                <Divider />
                <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
                  <IconButton size="small" onClick={() => openEdit(client)} sx={{ flex: 1 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteConfirm(client)} sx={{ flex: 1 }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={600}>{editing ? 'Edit Client' : 'New Client'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2}>
            <TextField
              label="Client Name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              label="Phone"
              fullWidth
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Client'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} maxWidth="xs">
        <DialogTitle fontWeight={600}>Delete Client?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove the client information from {deleteConfirm?.projects} project{deleteConfirm?.projects !== 1 ? 's' : ''}. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
            {saving ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
