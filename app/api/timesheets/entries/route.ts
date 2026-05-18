import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = req.nextUrl.searchParams;
    const timesheetId = sp.get('timesheet_id');
    const projectId = sp.get('project_id');
    const workDate = sp.get('work_date');

    if (timesheetId) {
      const result = await db.query(
        `SELECT te.*, json_build_object('id', p.id, 'name', p.name, 'cost_code', p.cost_code) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date`,
        [timesheetId],
      );
      return NextResponse.json(result.rows);
    }

    if (projectId && workDate) {
      const result = await db.query(
        `SELECT te.*, json_build_object('id', p.id, 'name', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.project_id = $1 AND te.work_date = $2 ORDER BY te.hours DESC`,
        [projectId, workDate],
      );
      return NextResponse.json(result.rows);
    }

    return NextResponse.json({ error: 'timesheet_id or project_id + work_date required' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const b = await req.json();
    const result = await db.query(
      `INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description, start_time, end_time, break_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.timesheet_id, b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0],
    );
    const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [b.timesheet_id]);
    await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), b.timesheet_id]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
