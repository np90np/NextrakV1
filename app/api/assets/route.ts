import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

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
      `INSERT INTO assets (name, asset_type, serial_number, registration, purchase_date, purchase_price, current_value, condition, status, assigned_project_id, assigned_employee_id, location, last_service_date, next_service_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.notes || ''],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
