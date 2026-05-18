import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Divider from '@mui/material/Divider';
import PeopleIcon from '@mui/icons-material/People';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BusinessIcon from '@mui/icons-material/Business';
import StorageIcon from '@mui/icons-material/Storage';
import Button from '@mui/material/Button';
import useApi from '../lib/apiClient';
import type { Project, Timesheet } from '../lib/database.types';
import { format, startOfWeek } from 'date-fns';

interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  pendingTimesheets: number;
  todayReports: number;
}

const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  active: 'success',
  planning: 'info',
  on_hold: 'warning',
  completed: 'default',
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
  draft: 'default',
};

const statusLabel: Record<string, string> = {
  active: 'Active',
  planning: 'Planning',
  on_hold: 'On Hold',
  completed: 'Completed',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
};

function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <Skeleton variant="text" width={60} height={44} />
            ) : (
              <Typography variant="h4" fontWeight={700}>
                {value}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeProjects: 0,
    pendingTimesheets: 0,
    todayReports: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');

      try {
        const api = useApi();
        // Expecting server endpoint to return: { stats: {...}, recentProjects: [], pendingTimesheets: [] }
        const res: any = await api.get(`/api/dashboard/overview?today=${today}`);
        setStats({
          totalEmployees: res.stats?.totalEmployees ?? 0,
          activeProjects: res.stats?.activeProjects ?? 0,
          pendingTimesheets: res.stats?.pendingTimesheets ?? 0,
          todayReports: res.stats?.todayReports ?? 0,
        });
        setRecentProjects(res.recentProjects ?? []);
        setPendingTimesheets((res.pendingTimesheets as Timesheet[]) ?? []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d');
  const weekEnd = format(new Date(), 'MMM d, yyyy');

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Week of {weekStart} – {weekEnd}
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3 }>
          <StatCard
            title="Active Employees"
            value={stats.totalEmployees}
            icon={<PeopleIcon />}
            color="secondary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3 }>
          <StatCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={<EngineeringIcon />}
            color="primary.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3 }>
          <StatCard
            title="Pending Timesheets"
            value={stats.pendingTimesheets}
            icon={<AccessTimeIcon />}
            color="warning.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={3 }>
          <StatCard
            title="Today's Reports"
            value={stats.todayReports}
            icon={<AssignmentIcon />}
            color="success.main"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Recent Projects */}
        <Grid item xs={12} md={7 }>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EngineeringIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Recent Projects
                </Typography>
              </Box>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
                ))
              ) : recentProjects.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No projects yet. Create your first project.
                </Typography>
              ) : (
                recentProjects.map((project, idx) => (
                  <Box key={project.id}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {project.client_name || 'No client'} • {project.city || 'No location'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        {project.budget > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            ${project.budget.toLocaleString()}
                          </Typography>
                        )}
                        <Chip
                          label={statusLabel[project.status]}
                          color={statusColor[project.status]}
                          size="small"
                        />
                      </Box>
                    </Box>
                    {idx < recentProjects.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Timesheets */}
        <Grid item xs={12} md={5 }>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTimeIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Awaiting Approval
                </Typography>
              </Box>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
                ))
              ) : pendingTimesheets.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 40 }} />
                  <Typography variant="body2" color="text.secondary">
                    All timesheets up to date
                  </Typography>
                </Box>
              ) : (
                <List dense disablePadding>
                  {pendingTimesheets.map((ts) => (
                    <ListItem key={ts.id} disablePadding sx={{ py: 0.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light', fontSize: '0.75rem' }}>
                          {ts.employee
                            ? `${ts.employee.first_name[0]}${ts.employee.last_name[0]}`
                            : '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          ts.employee
                            ? `${ts.employee.first_name} ${ts.employee.last_name}`
                            : 'Unknown'
                        }
                        secondary={`Week of ${format(new Date(ts.week_start_date), 'MMM d')} • ${ts.total_hours}h`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <PendingIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Quick actions reminder */}
          <Card sx={{ mt: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUpIcon />
                <Typography variant="subtitle2" fontWeight={600}>
                  MYOB Export Ready
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Export approved timesheets as CSV for direct import into MYOB AccountRight.
              </Typography>
            </CardContent>
          </Card>

          {/* Clients Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Client Management
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                View and manage client information across all projects.
              </Typography>
              <Button variant="outlined" size="small" fullWidth component="a" href="/clients">
                Manage Clients
              </Button>
            </CardContent>
          </Card>

          {/* Database Card */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" fontWeight={600}>
                  Database
                </Typography>
              </Box>
              <Stack spacing={0.75}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Employees</Typography>
                  <Typography variant="body2" fontWeight={600}>{stats.totalEmployees}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Projects</Typography>
                  <Typography variant="body2" fontWeight={600}>{stats.activeProjects}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Pending Timesheets</Typography>
                  <Typography variant="body2" fontWeight={600}>{stats.pendingTimesheets}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Powered by Supabase
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
