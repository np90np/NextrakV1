import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

const COLS = 'id, first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const sql = q
      ? `SELECT ${COLS} FROM employees WHERE LOWER(first_name||' '||last_name||' '||email||' '||position) LIKE $1 ORDER BY first_name`
      : `SELECT ${COLS} FROM employees ORDER BY first_name`;
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
      `INSERT INTO employees (first_name, last_name, email, phone, role, position, hourly_rate, employment_type, start_date, is_active, emergency_contact_name, emergency_contact_phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [b.first_name, b.last_name, b.email, b.phone, b.role, b.position, b.hourly_rate || 0, b.employment_type, b.start_date, b.is_active ?? true, b.emergency_contact_name, b.emergency_contact_phone],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
