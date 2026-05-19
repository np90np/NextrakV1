import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path } = await params;
  const sp = req.nextUrl.searchParams;

  try {
    // /api/timesheets/entries or /api/timesheets/entries/[id]
    if (path?.[0] === 'entries') {
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
    }

    // /api/timesheets/[id]
    if (path?.[0]) {
      const id = path[0];
      const ts = await db.query('SELECT * FROM timesheets WHERE id = $1', [id]);
      if (!ts.rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const entries = await db.query(
        `SELECT te.*, json_build_object('id', p.id, 'name', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date`,
        [id],
      );
      return NextResponse.json({ timesheet: ts.rows[0], entries: entries.rows });
    }

    // /api/timesheets
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    if (sp.get('employee_id')) { queryParams.push(sp.get('employee_id')); conditions.push(`t.employee_id = $${queryParams.length}`); }
    if (sp.get('date_from')) { queryParams.push(sp.get('date_from')); conditions.push(`t.week_start_date >= $${queryParams.length}`); }
    if (sp.get('date_to')) { queryParams.push(sp.get('date_to')); conditions.push(`t.week_start_date <= $${queryParams.length}`); }
    if (sp.get('status') && sp.get('status') !== 'all') { queryParams.push(sp.get('status')); conditions.push(`t.status = $${queryParams.length}`); }
    if (sp.get('week_start_date')) { queryParams.push(sp.get('week_start_date')); conditions.push(`t.week_start_date = $${queryParams.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT t.*, json_build_object('id', e.id, 'first_name', e.first_name, 'last_name', e.last_name, 'position', e.position) AS employee FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id ${where} ORDER BY t.week_start_date DESC`,
      queryParams,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path } = await params;
  try {
    const b = await req.json();

    // /api/timesheets/entries
    if (path?.[0] === 'entries') {
      const result = await db.query(
        `INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description, start_time, end_time, break_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [b.timesheet_id, b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0],
      );
      const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [b.timesheet_id]);
      await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), b.timesheet_id]);
      return NextResponse.json(result.rows[0], { status: 201 });
    }

    // /api/timesheets — create new timesheet, optionally copying entries from another
    const result = await db.query(
      `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES ($1,$2,$3,$4) RETURNING *`,
      [b.employee_id, b.week_start_date, b.status || 'draft', 0],
    );
    const newTs = result.rows[0];

    if (b.copy_from_id) {
      // Calculate day offset between source week and new week
      const sourceRes = await db.query('SELECT week_start_date FROM timesheets WHERE id = $1 AND employee_id = $2', [b.copy_from_id, b.employee_id]);
      if (sourceRes.rowCount && sourceRes.rows[0]) {
        const srcWeek = new Date(String(sourceRes.rows[0].week_start_date).slice(0, 10));
        const newWeek = new Date(String(newTs.week_start_date).slice(0, 10));
        const offsetDays = Math.round((newWeek.getTime() - srcWeek.getTime()) / (1000 * 60 * 60 * 24));

        await db.query(
          `INSERT INTO timesheet_entries (timesheet_id, project_id, work_date, hours, work_type, description, start_time, end_time, break_minutes)
           SELECT $1, project_id, work_date + $2, hours, work_type, description, start_time, end_time, break_minutes
           FROM timesheet_entries WHERE timesheet_id = $3`,
          [newTs.id, offsetDays, b.copy_from_id],
        );

        const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [newTs.id]);
        await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), newTs.id]);
        newTs.total_hours = Number(totalRes.rows[0].total || 0);
      }
    }

    return NextResponse.json(newTs, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path } = await params;
  try {
    const b = await req.json();

    // /api/timesheets/entries/[id]
    if (path?.[0] === 'entries' && path?.[1]) {
      const entryId = path[1];
      const result = await db.query(
        `UPDATE timesheet_entries SET project_id=$1, work_date=$2, hours=$3, work_type=$4, description=$5, start_time=$6, end_time=$7, break_minutes=$8 WHERE id=$9 RETURNING *`,
        [b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0, entryId],
      );
      const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [entryId]);
      const tsId = tsIdRes.rows[0].timesheet_id;
      const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
      await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
      return NextResponse.json(result.rows[0]);
    }

    // /api/timesheets/[id]
    if (path?.[0]) {
      const id = path[0];
      const fields: string[] = ['status = $1'];
      const vals: unknown[] = [b.status || 'draft'];
      let i = 2;
      if (b.total_hours !== undefined) { fields.push(`total_hours = $${i}`); vals.push(Number(b.total_hours)); i++; }
      if (b.approved_at !== undefined) { fields.push(`approved_at = $${i}`); vals.push(b.approved_at || null); i++; }
      if (b.rejection_reason !== undefined) { fields.push(`rejection_reason = $${i}`); vals.push(b.rejection_reason || null); i++; }
      vals.push(id);
      const result = await db.query(
        `UPDATE timesheets SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        vals,
      );
      return NextResponse.json(result.rows[0]);
    }

    return NextResponse.json({ error: 'id required' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { path } = await params;
  try {
    // /api/timesheets/entries/[id]
    if (path?.[0] === 'entries' && path?.[1]) {
      const entryId = path[1];
      const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [entryId]);
      const tsId = tsIdRes.rows[0]?.timesheet_id;
      await db.query('DELETE FROM timesheet_entries WHERE id = $1', [entryId]);
      if (tsId) {
        const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
        await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
      }
      return new NextResponse(null, { status: 204 });
    }

    // /api/timesheets/[id]
    if (path?.[0]) {
      await db.query('DELETE FROM timesheets WHERE id = $1', [path[0]]);
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: 'id required' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
