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
      `UPDATE daily_expenses SET project_id=$1, recorded_by=$2, expense_date=$3, category=$4, description=$5, amount=$6, receipt_number=$7, receipt_key=$8, supplier=$9, is_billable=$10 WHERE id=$11 RETURNING *`,
      [b.project_id, b.recorded_by, b.expense_date, b.category, b.description, b.amount || 0, b.receipt_number || null, b.receipt_key || null, b.supplier || null, b.is_billable !== false, id],
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
    await db.query('DELETE FROM daily_expenses WHERE id = $1', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
