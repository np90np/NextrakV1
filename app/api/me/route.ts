import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.query('SELECT * FROM employees WHERE clerk_user_id = $1 LIMIT 1', [userId]);
    if (result.rowCount === 0) return NextResponse.json({ clerkUserId: userId });
    return NextResponse.json({ clerkUserId: userId, employee: result.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
