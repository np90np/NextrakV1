const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const id = req.url?.split('/').pop();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const ts = await db.query('SELECT * FROM timesheets WHERE id = $1', [id]);
      if (ts.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      const entries = await db.query('SELECT te.*, json_build_object(\'id\', p.id, \'name\', p.name) AS project FROM timesheet_entries te LEFT JOIN projects p ON p.id = te.project_id WHERE te.timesheet_id = $1 ORDER BY te.work_date', [id]);
      return res.status(200).json({ timesheet: ts.rows[0], entries: entries.rows });
    }

    if (req.method === 'PUT') {
      const b = req.body;
      const updateSql = `UPDATE timesheets SET status=$1, total_hours=$2, approved_at=$3, rejection_reason=$4 WHERE id=$5 RETURNING *`;
      const params = [b.status || 'draft', b.total_hours || 0, b.approved_at || null, b.rejection_reason || null, id];
      const result = await db.query(updateSql, params);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      await db.query('DELETE FROM timesheets WHERE id = $1', [id]);
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('timesheets id error', err);
    res.status(500).json({ error: String(err) });
  }
};
