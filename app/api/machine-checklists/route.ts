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

    if (sp.get('inspected_by')) { params.push(sp.get('inspected_by')); conditions.push(`mc.inspected_by = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitRaw = sp.get('limit');
    const limitClause = limitRaw ? `LIMIT ${parseInt(limitRaw, 10)}` : '';

    const result = await db.query(
      `SELECT mc.*, json_build_object('name', p.name) AS project, json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS inspector FROM machine_checklists mc LEFT JOIN projects p ON p.id = mc.project_id LEFT JOIN employees e ON e.id = mc.inspected_by ${where} ORDER BY mc.inspection_date DESC ${limitClause}`,
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
      `INSERT INTO machine_checklists (project_id, inspected_by, inspection_date, machine_name, machine_id_number, asset_id, category, hours_reading, status, items, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || ''],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
