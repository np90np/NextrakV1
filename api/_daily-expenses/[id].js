const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    if (req.method === 'DELETE') {
      await db.query('DELETE FROM daily_expenses WHERE id = $1', [id]);
      return res.status(204).end();
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('daily-expenses [id] error', err);
    res.status(500).json({ error: String(err) });
  }
};
