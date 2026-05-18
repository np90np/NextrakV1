'use client';
import { AuthProvider } from '../../src/lib/auth';
import Layout from '../../src/components/Layout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Layout>{children}</Layout>
    </AuthProvider>
  );
}
