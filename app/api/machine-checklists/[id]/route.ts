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
      `UPDATE machine_checklists SET project_id=$1, inspected_by=$2, inspection_date=$3, machine_name=$4, machine_id_number=$5, asset_id=$6, category=$7, hours_reading=$8, status=$9, items=$10, notes=$11 WHERE id=$12 RETURNING *`,
      [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || '', id],
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
