import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ id?: string[] }> };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await db.query(
      `SELECT a.*, CASE WHEN a.assigned_project_id IS NOT NULL THEN json_build_object('name', p.name) ELSE NULL END AS project, CASE WHEN a.assigned_employee_id IS NOT NULL THEN json_build_object('first_name', e.first_name, 'last_name', e.last_name) ELSE NULL END AS employee FROM assets a LEFT JOIN projects p ON p.id = a.assigned_project_id LEFT JOIN employees e ON e.id = a.assigned_employee_id ORDER BY a.name`,
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
      `INSERT INTO assets (name, asset_type, serial_number, registration, purchase_date, purchase_price, current_value, condition, status, assigned_project_id, assigned_employee_id, location, last_service_date, next_service_date, current_smu, last_service_smu, service_interval_value, service_interval_unit, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.current_smu || 0, b.last_service_smu || 0, b.service_interval_value || null, b.service_interval_unit || 'hr', b.notes || ''],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  if (!id?.[0]) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const b = await req.json();
    const result = await db.query(
      `UPDATE assets SET name=$1, asset_type=$2, serial_number=$3, registration=$4, purchase_date=$5, purchase_price=$6, current_value=$7, condition=$8, status=$9, assigned_project_id=$10, assigned_employee_id=$11, location=$12, last_service_date=$13, next_service_date=$14, current_smu=$15, last_service_smu=$16, service_interval_value=$17, service_interval_unit=$18, notes=$19 WHERE id=$20 RETURNING *`,
      [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.current_smu || 0, b.last_service_smu || 0, b.service_interval_value || null, b.service_interval_unit || 'hr', b.notes || '', id[0]],
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
