import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ id?: string[] }> };

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  try {
    const conditions: string[] = [];
    const queryParams: unknown[] = [];
    if (sp.get('inspected_by')) { queryParams.push(sp.get('inspected_by')); conditions.push(`mc.inspected_by = $${queryParams.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitRaw = sp.get('limit');
    const limitClause = limitRaw ? `LIMIT ${parseInt(limitRaw, 10)}` : '';
    const result = await db.query(
      `SELECT mc.*, json_build_object('name', p.name) AS project, json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS inspector FROM machine_checklists mc LEFT JOIN projects p ON p.id = mc.project_id LEFT JOIN employees e ON e.id = mc.inspected_by ${where} ORDER BY mc.inspection_date DESC ${limitClause}`,
      queryParams,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function syncAssetSmu(assetId: string | null | undefined, hoursReading: number) {
  if (!assetId || hoursReading <= 0) return;
  await db.query(
    'UPDATE assets SET current_smu = GREATEST(current_smu, $1) WHERE id = $2',
    [hoursReading, assetId],
  );
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
    await syncAssetSmu(b.asset_id, b.hours_reading || 0);
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
      `UPDATE machine_checklists SET project_id=$1, inspected_by=$2, inspection_date=$3, machine_name=$4, machine_id_number=$5, asset_id=$6, category=$7, hours_reading=$8, status=$9, items=$10, notes=$11 WHERE id=$12 RETURNING *`,
      [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || '', id[0]],
    );
    await syncAssetSmu(b.asset_id, b.hours_reading || 0);
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
