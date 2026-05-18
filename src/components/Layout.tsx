import React, { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadIcon from '@mui/icons-material/Download';
import ConstructionIcon from '@mui/icons-material/Construction';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PersonIcon from '@mui/icons-material/Person';
import ChecklistIcon from '@mui/icons-material/Checklist';
import LogoutIcon from '@mui/icons-material/Logout';
import InventoryIcon from '@mui/icons-material/Inventory2';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../lib/auth';

const DRAWER_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: Array<'admin' | 'manager' | 'supervisor' | 'employee'>;
}

const allNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon />, roles: ['admin', 'manager', 'employee'] },
  { label: 'Projects', path: '/projects', icon: <EngineeringIcon />, roles: ['admin', 'manager'] },
  { label: 'Clients', path: '/clients', icon: <BusinessIcon />, roles: ['admin', 'manager'] },
  { label: 'Employees', path: '/employees', icon: <PeopleIcon />, roles: ['admin', 'manager'] },
  { label: 'Assets', path: '/assets', icon: <InventoryIcon />, roles: ['admin', 'manager'] },
  { label: 'My Timesheet', path: '/my-timesheet', icon: <PersonIcon />, roles: ['admin', 'manager', 'employee'] },
  { label: 'Timesheets', path: '/timesheets', icon: <AccessTimeIcon />, roles: ['admin', 'manager'] },
  { label: 'Daily Diary', path: '/reports', icon: <AssignmentIcon />, roles: ['admin', 'manager', 'supervisor'] },
  { label: 'Prestart Checks', path: '/checklists', icon: <ChecklistIcon />, roles: ['admin', 'manager', 'employee'] },
  { label: 'Export', path: '/export', icon: <DownloadIcon />, roles: ['admin', 'manager'] },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { employee, signOut } = useAuth();

  const role = employee?.role ?? 'employee';
  const navItems = useMemo(() => allNavItems.filter((item) => item.roles.includes(role)), [role]);

  const displayName = employee ? `${employee.first_name} ${employee.last_name}` : 'User';
  const displayRole = employee ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1) : '';
  const displayInitials = employee ? `${employee.first_name[0] ?? ''}${employee.last_name[0] ?? ''}`.toUpperCase() : 'U';

  const handleNavClick = (path: string) => {
    router.push(path);
    if (isMobile) setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <ConstructionIcon sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            BuildTrack
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Construction Management
          </Typography>
        </Box>
        {isMobile && (
          <IconButton
            sx={{ ml: 'auto', color: 'inherit' }}
            onClick={() => setMobileOpen(false)}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path ||
            (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1, mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: isActive ? 'inherit' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 400, fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
          {displayInitials}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flex: 1 }}>
          <Typography variant="body2" fontWeight={600} noWrap>{displayName}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{displayRole}</Typography>
        </Box>
        <IconButton size="small" onClick={signOut} title="Sign Out">
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          bgcolor: 'background.default',
        }}
      >
        {isMobile && (
          <AppBar
            position="sticky"
            color="default"
            sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
            elevation={0}
          >
            <Toolbar variant="dense">
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <ConstructionIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" fontWeight={700} color="primary">
                BuildTrack
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
