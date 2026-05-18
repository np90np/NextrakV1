import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (!result.rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const b = await req.json();
    const result = await db.query(
      `UPDATE projects SET name=$1, description=$2, client_name=$3, client_email=$4, client_phone=$5, address=$6, city=$7, state=$8, postcode=$9, cost_code=$10, status=$11, budget=$12, contract_value=$13, start_date=$14, end_date=$15, manager_id=$16 WHERE id=$17 RETURNING *`,
      [b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id, id],
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
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
