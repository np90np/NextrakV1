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

    if (sp.get('date_from')) { params.push(sp.get('date_from')); conditions.push(`dr.report_date >= $${params.length}`); }
    if (sp.get('date_to')) { params.push(sp.get('date_to')); conditions.push(`dr.report_date <= $${params.length}`); }
    if (sp.get('project_id')) { params.push(sp.get('project_id')); conditions.push(`dr.project_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT dr.*, json_build_object('name', p.name) AS project, json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS reporter FROM daily_reports dr LEFT JOIN projects p ON p.id = dr.project_id LEFT JOIN employees e ON e.id = dr.reported_by ${where} ORDER BY dr.report_date DESC`,
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
      `INSERT INTO daily_reports (project_id, reported_by, report_date, weather, temperature, workers_on_site, progress_notes, issues, materials_used, equipment_used, visitors, safety_incidents, is_complete) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [b.project_id, b.reported_by, b.report_date, b.weather || '', b.temperature || '', b.workers_on_site || 0, b.progress_notes || '', b.issues || '', b.materials_used || '', b.equipment_used || '', b.visitors || '', b.safety_incidents || '', b.is_complete || false],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
