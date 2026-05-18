import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const ts = await db.query('SELECT * FROM timesheets WHERE id = $1', [id]);
    if (!ts.rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const entries = await db.query(
      `SELECT te.*, json_build_object('id', p.id, 'name', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date`,
      [id],
    );
    return NextResponse.json({ timesheet: ts.rows[0], entries: entries.rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const b = await req.json();
    const result = await db.query(
      `UPDATE timesheets SET status=$1, total_hours=$2, approved_at=$3, rejection_reason=$4 WHERE id=$5 RETURNING *`,
      [b.status || 'draft', b.total_hours || 0, b.approved_at || null, b.rejection_reason || null, id],
    );
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
    await db.query('DELETE FROM timesheets WHERE id = $1', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
