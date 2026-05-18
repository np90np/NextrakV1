import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = req.nextUrl.searchParams;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (sp.get('employee_id')) { params.push(sp.get('employee_id')); conditions.push(`t.employee_id = $${params.length}`); }
    if (sp.get('date_from')) { params.push(sp.get('date_from')); conditions.push(`t.week_start_date >= $${params.length}`); }
    if (sp.get('date_to')) { params.push(sp.get('date_to')); conditions.push(`t.week_start_date <= $${params.length}`); }
    if (sp.get('status') && sp.get('status') !== 'all') { params.push(sp.get('status')); conditions.push(`t.status = $${params.length}`); }
    if (sp.get('week_start_date')) { params.push(sp.get('week_start_date')); conditions.push(`t.week_start_date = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT t.*, json_build_object('id', e.id, 'first_name', e.first_name, 'last_name', e.last_name, 'position', e.position) AS employee FROM timesheets t LEFT JOIN employees e ON e.id = t.employee_id ${where} ORDER BY t.week_start_date DESC`,
      params,
    );
    return NextResponse.json(result.rows);
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
      `INSERT INTO timesheets (employee_id, week_start_date, status, total_hours) VALUES ($1,$2,$3,$4) RETURNING *`,
      [b.employee_id, b.week_start_date, b.status || 'draft', b.total_hours || 0],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
