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
      `UPDATE daily_reports SET project_id=$1, reported_by=$2, report_date=$3, weather=$4, temperature=$5, workers_on_site=$6, progress_notes=$7, issues=$8, materials_used=$9, equipment_used=$10, visitors=$11, safety_incidents=$12, is_complete=$13 WHERE id=$14 RETURNING *`,
      [b.project_id, b.reported_by, b.report_date, b.weather || '', b.temperature || '', b.workers_on_site || 0, b.progress_notes || '', b.issues || '', b.materials_used || '', b.equipment_used || '', b.visitors || '', b.safety_incidents || '', b.is_complete || false, id],
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
    await db.query('DELETE FROM daily_expenses WHERE daily_report_id = $1', [id]);
    await db.query('DELETE FROM daily_reports WHERE id = $1', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
