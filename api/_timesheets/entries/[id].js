const { authorize } = require('../../_auth');
const db = require('../../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const id = req.url?.split('/').pop();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'PUT') {
      const b = req.body;
      const updateSql = `UPDATE timesheet_entries SET project_id=$1, work_date=$2, hours=$3, work_type=$4, description=$5, start_time=$6, end_time=$7, break_minutes=$8 WHERE id=$9 RETURNING *`;
      const params = [b.project_id || null, b.work_date, b.hours || 0, b.work_type || 'ordinary', b.description || null, b.start_time || null, b.end_time || null, b.break_minutes || 0, id];
      const result = await db.query(updateSql, params);
      // recalc timesheet total
      const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [id]);
      const tsId = tsIdRes.rows[0].timesheet_id;
      const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
      await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const tsIdRes = await db.query('SELECT timesheet_id FROM timesheet_entries WHERE id = $1', [id]);
      const tsId = tsIdRes.rows[0]?.timesheet_id;
      await db.query('DELETE FROM timesheet_entries WHERE id = $1', [id]);
      if (tsId) {
        const totalRes = await db.query('SELECT COALESCE(SUM(hours),0) AS total FROM timesheet_entries WHERE timesheet_id = $1', [tsId]);
        await db.query('UPDATE timesheets SET total_hours = $1 WHERE id = $2', [Number(totalRes.rows[0].total || 0), tsId]);
      }
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('timesheet entry id error', err);
    res.status(500).json({ error: String(err) });
  }
};
