import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { fileName, contentType } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'fileName is required' }, { status: 400 });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `receipts/${crypto.randomUUID()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });
    return NextResponse.json({ uploadUrl, fileKey: key });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
