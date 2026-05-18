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
      `UPDATE assets SET name=$1, asset_type=$2, serial_number=$3, registration=$4, purchase_date=$5, purchase_price=$6, current_value=$7, condition=$8, status=$9, assigned_project_id=$10, assigned_employee_id=$11, location=$12, last_service_date=$13, next_service_date=$14, notes=$15 WHERE id=$16 RETURNING *`,
      [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.notes || '', id],
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
