import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const b = await req.json();
    const result = await db.query(
      `UPDATE timesheet_entries SET project_id=$1, work_date=$2, hours=$3, work_type=$4, description=$5, start_time=$6, end_time=$7, break_minutes=$8 WHERE id=$9 RETURNING *`,
      [b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0, id],
    );
    const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [id]);
    const tsId = tsIdRes.rows[0].timesheet_id;
    const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
    await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [id]);
    const tsId = tsIdRes.rows[0]?.timesheet_id;
    await db.query('DELETE FROM timesheet_entries WHERE id = $1', [id]);
    if (tsId) {
      const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
      await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
