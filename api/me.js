const { authorize } = require('./_auth');
const db = require('./_db');

module.exports = async (req, res) => {
  const payload = await authorize(req, res);
  if (!payload) return;

  try {
    // payload.sub should be the Clerk user id
    const clerkUserId = payload.sub;
    const result = await db.query('SELECT * FROM employees WHERE clerk_user_id = $1 LIMIT 1', [clerkUserId]);
    if (result.rowCount === 0) {
      // return minimal user info
      return res.status(200).json({ clerkUserId });
    }
    return res.status(200).json({ clerkUserId, employee: result.rows[0] });
  } catch (err) {
    console.error('/api/me error', err);
    res.status(500).json({ error: String(err) });
  }
};
