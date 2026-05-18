import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const reportId = req.nextUrl.searchParams.get('report_id');
    if (!reportId) return NextResponse.json({ error: 'report_id required' }, { status: 400 });

    const result = await db.query(
      `SELECT de.*, json_build_object('name', p.name) AS project, json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS recorder FROM daily_expenses de LEFT JOIN projects p ON p.id = de.project_id LEFT JOIN employees e ON e.id = de.recorded_by WHERE de.daily_report_id = $1 ORDER BY de.category`,
      [reportId],
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
      `INSERT INTO daily_expenses (daily_report_id, project_id, recorded_by, expense_date, category, description, amount, receipt_number, receipt_key, supplier, is_billable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.daily_report_id, b.project_id, b.recorded_by, b.expense_date, b.category, b.description, b.amount || 0, b.receipt_number || null, b.receipt_key || null, b.supplier || null, b.is_billable !== false],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
