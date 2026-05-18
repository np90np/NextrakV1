import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const sql = q
      ? `SELECT * FROM projects WHERE LOWER(name||' '||client_name||' '||city) LIKE $1 ORDER BY created_at DESC`
      : `SELECT * FROM projects ORDER BY created_at DESC`;
    const result = await db.query(sql, q ? [`%${q.toLowerCase()}%`] : []);
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
      `INSERT INTO projects (name, description, client_name, client_email, client_phone, address, city, state, postcode, cost_code, status, budget, contract_value, start_date, end_date, manager_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
