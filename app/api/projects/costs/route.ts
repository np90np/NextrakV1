import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const idsParam = req.nextUrl.searchParams.get('ids') ?? req.nextUrl.searchParams.get('projectIds') ?? '';
    const ids = idsParam.split(',').filter(Boolean);
    if (ids.length === 0) return NextResponse.json({});

    const [tsRes, expRes] = await Promise.all([
      db.query(
        `SELECT te.project_id, COALESCE(SUM((te.hours::numeric) * COALESCE(e.hourly_rate,0)),0) AS timesheet_cost FROM timesheet_entries te JOIN timesheets t ON t.id = te.timesheet_id JOIN employees e ON e.id = t.employee_id WHERE te.project_id = ANY($1::uuid[]) GROUP BY te.project_id`,
        [ids],
      ),
      db.query(
        `SELECT project_id, COALESCE(SUM(amount),0) AS expense_cost FROM daily_expenses WHERE project_id = ANY($1::uuid[]) GROUP BY project_id`,
        [ids],
      ),
    ]);

    const map: Record<string, { timesheetCost: number; expenseCost: number }> = {};
    for (const r of tsRes.rows) map[r.project_id] = { timesheetCost: Number(r.timesheet_cost || 0), expenseCost: 0 };
    for (const r of expRes.rows) {
      map[r.project_id] = map[r.project_id] ?? { timesheetCost: 0, expenseCost: 0 };
      map[r.project_id].expenseCost = Number(r.expense_cost || 0);
    }

    return NextResponse.json(map);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
