const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { authorize } = require('./_auth');

const BUCKET = process.env.R2_BUCKET;
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!BUCKET || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.warn('R2 credentials are not fully configured for upload.js');
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: false,
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  if (!(await authorize(req, res))) return;

  try {
    const { fileName, contentType } = req.body || {};
    if (!fileName) return res.status(400).json({ error: 'fileName is required' });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `receipts/${crypto.randomUUID()}-${safeName}`;

    const cmd = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ uploadUrl, fileKey: key });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ error: String(err) });
  }
};
