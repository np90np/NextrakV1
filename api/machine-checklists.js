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
          `UPDATE machine_checklists SET project_id=$1, inspected_by=$2, inspection_date=$3, machine_name=$4, machine_id_number=$5, asset_id=$6, category=$7, hours_reading=$8, status=$9, items=$10, notes=$11 WHERE id=$12 RETURNING *`,
          [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || '', id]
        );
        return res.status(200).json(result.rows[0]);
      }
    } else {
      if (req.method === 'GET') {
        const { inspected_by, limit } = req.query;
        const conditions = [];
        const params = [];
        if (inspected_by) { params.push(inspected_by); conditions.push(`mc.inspected_by = $${params.length}`); }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = limit ? `LIMIT ${parseInt(limit, 10)}` : '';
        const result = await db.query(`
          SELECT mc.*,
            json_build_object('name', p.name) AS project,
            json_build_object('first_name', e.first_name, 'last_name', e.last_name) AS inspector
          FROM machine_checklists mc
          LEFT JOIN projects p ON p.id = mc.project_id
          LEFT JOIN employees e ON e.id = mc.inspected_by
          ${where}
          ORDER BY mc.inspection_date DESC
          ${limitClause}
        `, params);
        return res.status(200).json(result.rows);
      }
      if (req.method === 'POST') {
        const b = req.body;
        const result = await db.query(
          `INSERT INTO machine_checklists (project_id, inspected_by, inspection_date, machine_name, machine_id_number, asset_id, category, hours_reading, status, items, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || '']
        );
        return res.status(201).json(result.rows[0]);
      }
    }
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('machine-checklists error', err);
    res.status(500).json({ error: String(err) });
  }
};
