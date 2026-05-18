'use client';
import { useAuth } from '../../src/lib/auth';
import Dashboard from '../../src/views/Dashboard';
import EmployeeDashboard from '../../src/views/EmployeeDashboard';

export default function RootPage() {
  const { employee } = useAuth();
  return employee?.role === 'employee' ? <EmployeeDashboard /> : <Dashboard />;
}
