import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = req.nextUrl.searchParams.get('today') ?? new Date().toISOString().slice(0, 10);

    // Monday of the current week
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + diffToMonday);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const [empRes, projRes, tsRes, reportRes, recentProjRes, pendingTsRes, recentReportsRes, approvedTsRes, serviceDueRes] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM employees WHERE is_active = true'),
      db.query("SELECT COUNT(*)::int AS count FROM projects WHERE status = 'active'"),
      db.query("SELECT COUNT(*)::int AS count FROM timesheets WHERE status = 'submitted'"),
      db.query('SELECT COUNT(*)::int AS count FROM daily_reports WHERE report_date = $1', [today]),
      db.query("SELECT id, name, client_name, city, status, budget FROM projects WHERE status = 'active' ORDER BY created_at DESC LIMIT 5"),
      db.query("SELECT t.id, t.employee_id, t.week_start_date, t.total_hours, t.created_at, e.first_name, e.last_name FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id WHERE t.status = 'submitted' ORDER BY t.created_at DESC LIMIT 5"),
      db.query(`SELECT dr.id, dr.report_date, dr.progress_notes, dr.workers_on_site, dr.is_complete, p.name AS project_name, e.first_name, e.last_name FROM daily_reports dr LEFT JOIN projects p ON p.id = dr.project_id LEFT JOIN employees e ON e.id = dr.reported_by ORDER BY dr.report_date DESC, dr.id DESC LIMIT 7`),
      db.query("SELECT COUNT(*)::int AS count FROM timesheets WHERE status = 'approved' AND week_start_date >= $1", [weekStartStr]),
      db.query(`
        SELECT id, name, asset_type, current_smu, last_service_smu, service_interval_value, service_interval_unit,
               (last_service_smu + service_interval_value - current_smu) AS remaining
        FROM assets
        WHERE service_interval_value IS NOT NULL
          AND service_interval_value > 0
          AND status != 'retired'
          AND (last_service_smu + service_interval_value - current_smu) <= (service_interval_value * 0.15)
        ORDER BY remaining ASC
        LIMIT 5
      `),
    ]);

    return NextResponse.json({
      stats: {
        totalEmployees: empRes.rows[0]?.count ?? 0,
        activeProjects: projRes.rows[0]?.count ?? 0,
        pendingTimesheets: tsRes.rows[0]?.count ?? 0,
        todayReports: reportRes.rows[0]?.count ?? 0,
        approvedThisWeek: approvedTsRes.rows[0]?.count ?? 0,
      },
      recentProjects: recentProjRes.rows,
      pendingTimesheets: pendingTsRes.rows,
      recentReports: recentReportsRes.rows,
      serviceDueAssets: serviceDueRes.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
