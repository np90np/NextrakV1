import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = req.nextUrl.searchParams.get('today') ?? new Date().toISOString().slice(0, 10);

    const [empRes, projRes, tsRes, reportRes, recentProjRes, pendingTsRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM employees WHERE is_active = true'),
      db.query("SELECT COUNT(*)::int AS count FROM projects WHERE status = 'active'"),
      db.query("SELECT COUNT(*)::int AS count FROM timesheets WHERE status = 'submitted'"),
      db.query('SELECT COUNT(*)::int AS count FROM daily_reports WHERE report_date = $1', [today]),
      db.query('SELECT id, name, client_name, city, status, budget FROM projects ORDER BY created_at DESC LIMIT 5'),
      db.query("SELECT t.id, t.employee_id, t.created_at, e.first_name, e.last_name FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id WHERE t.status = 'submitted' ORDER BY t.created_at DESC LIMIT 5"),
    ]);

    return NextResponse.json({
      stats: {
        totalEmployees: empRes.rows[0]?.count ?? 0,
        activeProjects: projRes.rows[0]?.count ?? 0,
        pendingTimesheets: tsRes.rows[0]?.count ?? 0,
        todayReports: reportRes.rows[0]?.count ?? 0,
      },
      recentProjects: recentProjRes.rows,
      pendingTimesheets: pendingTsRes.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
