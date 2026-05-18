const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    if (req.method === 'PUT') {
      const b = req.body;
      const result = await db.query(
        `UPDATE daily_reports SET project_id=$1, reported_by=$2, report_date=$3, weather=$4, temperature=$5, workers_on_site=$6, progress_notes=$7, issues=$8, materials_used=$9, equipment_used=$10, visitors=$11, safety_incidents=$12, is_complete=$13 WHERE id=$14 RETURNING *`,
        [b.project_id, b.reported_by, b.report_date, b.weather || '', b.temperature || '', b.workers_on_site || 0, b.progress_notes || '', b.issues || '', b.materials_used || '', b.equipment_used || '', b.visitors || '', b.safety_incidents || '', b.is_complete || false, id]
      );
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      await db.query('DELETE FROM daily_expenses WHERE daily_report_id = $1', [id]);
      await db.query('DELETE FROM daily_reports WHERE id = $1', [id]);
      return res.status(204).end();
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('daily-reports [id] error', err);
    res.status(500).json({ error: String(err) });
  }
};
