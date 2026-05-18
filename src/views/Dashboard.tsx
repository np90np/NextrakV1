'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PeopleIcon from '@mui/icons-material/People';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/HourglassEmpty';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import useApi from '../lib/apiClient';
import type { Project, Timesheet } from '../lib/database.types';
import { format, startOfWeek } from 'date-fns';

interface RecentReport {
  id: string;
  report_date: string;
  progress_notes: string;
  workers_on_site: number;
  is_complete: boolean;
  project_name: string | null;
  first_name: string;
  last_name: string;
}

interface DashboardStats {
  totalEmployees: number;
  activeProjects: number;
  pendingTimesheets: number;
  todayReports: number;
  approvedThisWeek: number;
}

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const projectStatusColor: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  active: 'success', planning: 'info', on_hold: 'warning', completed: 'default',
};
const projectStatusLabel: Record<string, string> = {
  active: 'Active', planning: 'Planning', on_hold: 'On Hold', completed: 'Completed',
};

function StatCard({
  title, value, icon, bgcolor, onClick, loading,
}: {
  title: string; value: number; icon: React.ReactNode;
  bgcolor: string; onClick: () => void; loading: boolean;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {title}
              </Typography>
              {loading ? (
                <Skeleton variant="text" width={48} height={40} />
              ) : (
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.25 }}>
                  {value}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor, width: 44, height: 44 }}>{icon}</Avatar>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

const quickActions = [
  { label: 'New Report', icon: <AddIcon fontSize="small" />, href: '/reports', color: 'primary' as const },
  { label: 'Timesheets', icon: <AccessTimeIcon fontSize="small" />, href: '/timesheets', color: 'warning' as const },
  { label: 'Export', icon: <DownloadIcon fontSize="small" />, href: '/export', color: 'success' as const },
  { label: 'Employees', icon: <PeopleIcon fontSize="small" />, href: '/employees', color: 'secondary' as const },
];

export default function Dashboard() {
  const router = useRouter();
  const api = useApi();
  const [stats, setStats] = useState<DashboardStats>({ totalEmployees: 0, activeProjects: 0, pendingTimesheets: 0, todayReports: 0, approvedThisWeek: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<Timesheet[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState('');

  useEffect(() => {
    const now = new Date();
    const ws = format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d');
    const we = format(now, 'MMM d, yyyy');
    setWeekLabel(`${ws} – ${we}`);

    (async () => {
      setLoading(true);
      try {
        const today = format(now, 'yyyy-MM-dd');
        const res: any = await api.get(`/api/dashboard/overview?today=${today}`);
        setStats({
          totalEmployees: res.stats?.totalEmployees ?? 0,
          activeProjects: res.stats?.activeProjects ?? 0,
          pendingTimesheets: res.stats?.pendingTimesheets ?? 0,
          todayReports: res.stats?.todayReports ?? 0,
          approvedThisWeek: res.stats?.approvedThisWeek ?? 0,
        });
        setRecentProjects(res.recentProjects ?? []);
        setPendingTimesheets((res.pendingTimesheets as Timesheet[]) ?? []);
        setRecentReports(res.recentReports ?? []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Week of {weekLabel}</Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Active Employees', value: stats.totalEmployees, icon: <PeopleIcon />, bgcolor: 'secondary.main', href: '/employees' },
          { title: 'Active Projects', value: stats.activeProjects, icon: <EngineeringIcon />, bgcolor: 'primary.main', href: '/projects' },
          { title: 'Pending Timesheets', value: stats.pendingTimesheets, icon: <AccessTimeIcon />, bgcolor: 'warning.main', href: '/timesheets' },
          { title: "Today's Reports", value: stats.todayReports, icon: <AssignmentIcon />, bgcolor: 'success.main', href: '/reports' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.title}>
            <StatCard {...s} color={s.bgcolor} onClick={() => router.push(s.href)} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={2}>
        {/* Left column */}
        <Grid item xs={12} md={8}>
          {/* Recent Projects */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2.5, pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EngineeringIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Active Projects</Typography>
                </Box>
                <Tooltip title="View all projects">
                  <IconButton size="small" onClick={() => router.push('/projects')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
              {loading ? (
                <Box sx={{ px: 3, py: 1 }}>
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />)}
                </Box>
              ) : recentProjects.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <EngineeringIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No projects yet.</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => router.push('/projects')}>Create Project</Button>
                </Box>
              ) : (
                recentProjects.map((proj, idx) => (
                  <Box key={proj.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 1.5, gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 36, height: 36, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                        {proj.name.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{proj.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {[proj.client_name, proj.city].filter(Boolean).join(' • ') || 'No details'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        {Number(proj.budget) > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                            ${Number(proj.budget).toLocaleString()}
                          </Typography>
                        )}
                        <Chip label={projectStatusLabel[proj.status] ?? proj.status} color={projectStatusColor[proj.status] ?? 'default'} size="small" />
                      </Box>
                    </Box>
                    {idx < recentProjects.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Daily Reports */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2.5, pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Recent Daily Reports</Typography>
                </Box>
                <Tooltip title="View all reports">
                  <IconButton size="small" onClick={() => router.push('/reports')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
              {loading ? (
                <Box sx={{ px: 3, py: 1 }}>
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={56} sx={{ mb: 0.5 }} />)}
                </Box>
              ) : recentReports.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <AssignmentIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No reports this week.</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => router.push('/reports')}>Create Report</Button>
                </Box>
              ) : (
                recentReports.map((rpt, idx) => (
                  <Box key={rpt.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 1.5, gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.light', color: 'success.dark', width: 36, height: 36, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                        {`${rpt.first_name?.[0] ?? ''}${rpt.last_name?.[0] ?? ''}`.toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {rpt.first_name} {rpt.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {rpt.project_name ?? 'No project'} · {rpt.progress_notes ? rpt.progress_notes.slice(0, 50) + (rpt.progress_notes.length > 50 ? '…' : '') : 'No notes'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {format(parseLocalDate(rpt.report_date), 'MMM d')}
                        </Typography>
                        <Chip
                          label={rpt.is_complete ? 'Complete' : 'Draft'}
                          color={rpt.is_complete ? 'success' : 'default'}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Box>
                    {idx < recentReports.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          {/* Timesheet Overview */}
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, pt: 2.5, pb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Timesheet Status</Typography>
                </Box>
                <Tooltip title="View all timesheets">
                  <IconButton size="small" onClick={() => router.push('/timesheets')}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
              <Box sx={{ px: 3, py: 2 }}>
                <Grid container spacing={2}>
                  {[
                    { label: 'Awaiting Approval', value: stats.pendingTimesheets, color: 'warning.main', bgcolor: 'warning.light' },
                    { label: 'Approved This Week', value: stats.approvedThisWeek, color: 'success.main', bgcolor: 'success.light' },
                    { label: 'Active Employees', value: stats.totalEmployees, color: 'primary.main', bgcolor: 'primary.light' },
                  ].map((item) => (
                    <Grid item xs={4} key={item.label}>
                      <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                        {loading ? <Skeleton height={32} /> : (
                          <Typography variant="h5" fontWeight={700} color={item.color}>{item.value}</Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={4}>
          {/* Awaiting Approval */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, pt: 2, pb: 1.5 }}>
                <PendingIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={700}>Awaiting Approval</Typography>
                {stats.pendingTimesheets > 0 && (
                  <Chip label={stats.pendingTimesheets} color="warning" size="small" sx={{ ml: 'auto' }} />
                )}
              </Box>
              <Divider />
              {loading ? (
                <Box sx={{ px: 2.5, py: 1 }}>
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />)}
                </Box>
              ) : pendingTimesheets.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 36, mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">All timesheets up to date</Typography>
                </Box>
              ) : (
                <Stack divider={<Divider />}>
                  {pendingTimesheets.map((ts) => (
                    <Box key={ts.id} sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.25, gap: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: 'warning.light', color: 'warning.dark', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                        {ts.employee ? `${ts.employee.first_name[0]}${ts.employee.last_name[0]}` : '?'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {ts.employee ? `${ts.employee.first_name} ${ts.employee.last_name}` : 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {format(parseLocalDate(ts.week_start_date), 'MMM d')} · {ts.total_hours}h
                        </Typography>
                      </Box>
                      <Button size="small" variant="outlined" color="warning" sx={{ flexShrink: 0, minWidth: 0, px: 1, fontSize: '0.7rem' }}
                        onClick={() => router.push('/timesheets')}>
                        Review
                      </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>Quick Actions</Typography>
              </Box>
              <Divider />
              <Box sx={{ p: 1.5 }}>
                <Grid container spacing={1}>
                  {quickActions.map((action) => (
                    <Grid item xs={6} key={action.label}>
                      <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: `${action.color}.main`, bgcolor: `${action.color}.50` } }}
                        onClick={() => router.push(action.href)}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                          <Avatar sx={{ bgcolor: `${action.color}.light`, color: `${action.color}.dark`, width: 32, height: 32, mx: 'auto', mb: 0.5 }}>
                            {action.icon}
                          </Avatar>
                          <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                            {action.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
