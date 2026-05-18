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
        `UPDATE machine_checklists SET project_id=$1, inspected_by=$2, inspection_date=$3, machine_name=$4, machine_id_number=$5, asset_id=$6, category=$7, hours_reading=$8, status=$9, items=$10, notes=$11 WHERE id=$12 RETURNING *`,
        [b.project_id, b.inspected_by, b.inspection_date, b.machine_name, b.machine_id_number || null, b.asset_id || null, b.category || null, b.hours_reading || 0, b.status || 'submitted', JSON.stringify(b.items || []), b.notes || '', id]
      );
      return res.status(200).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('machine-checklists [id] error', err);
    res.status(500).json({ error: String(err) });
  }
};
