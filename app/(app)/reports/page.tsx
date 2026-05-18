'use client';
import { Suspense } from 'react';
import DailyReports from '../../../src/views/DailyReports';

// useSearchParams requires a Suspense boundary in Next.js App Router
export default function ReportsPage() {
  return (
    <Suspense>
      <DailyReports />
    </Suspense>
  );
}
