const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const url = require('url');
const { authorize } = require('./_auth');

const BUCKET = process.env.R2_BUCKET;
const ENDPOINT = process.env.R2_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!BUCKET || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.warn('R2 credentials are not fully configured for download.js');
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
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');
  if (!(await authorize(req, res))) return;

  try {
    const { key } = req.query || (req.url && url.parse(req.url, true).query) || {};
    if (!key) return res.status(400).json({ error: 'key is required' });

    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ downloadUrl });
  } catch (err) {
    console.error('download error', err);
    res.status(500).json({ error: String(err) });
  }
};
