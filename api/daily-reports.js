const { authorize } = require('./_auth');
const db = require('./_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const { id } = req.query;

  try {
    if (id) {
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
    } else {
      if (req.method === 'GET') {
        const { date_from, date_to } = req.query;
        const conditions = [];
        const params = [];
        if (date_from) { params.push(date_from); conditions.push(`dr.report_date >= $${params.length}`); }
        if (date_to) { params.push(date_to); conditions.push(`dr.report_date <= $${params.length}`); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`
          SELECT dr.*,
            json_build_object('name', p.name) AS project,
            json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS reporter
          FROM daily_reports dr
          LEFT JOIN projects p ON p.id = dr.project_id
          LEFT JOIN employees e ON e.id = dr.reported_by
          ${where}
          ORDER BY dr.report_date DESC
        `, params);
        return res.status(200).json(result.rows);
      }
      if (req.method === 'POST') {
        const b = req.body;
        const result = await db.query(
          `INSERT INTO daily_reports (project_id, reported_by, report_date, weather, temperature, workers_on_site, progress_notes, issues, materials_used, equipment_used, visitors, safety_incidents, is_complete) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          [b.project_id, b.reported_by, b.report_date, b.weather || '', b.temperature || '', b.workers_on_site || 0, b.progress_notes || '', b.issues || '', b.materials_used || '', b.equipment_used || '', b.visitors || '', b.safety_incidents || '', b.is_complete || false]
        );
        return res.status(201).json(result.rows[0]);
      }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('daily-reports error', err);
    res.status(500).json({ error: String(err) });
  }
};
