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
        `UPDATE assets SET name=$1, asset_type=$2, serial_number=$3, registration=$4, purchase_date=$5, purchase_price=$6, current_value=$7, condition=$8, status=$9, assigned_project_id=$10, assigned_employee_id=$11, location=$12, last_service_date=$13, next_service_date=$14, notes=$15 WHERE id=$16 RETURNING *`,
        [b.name, b.asset_type, b.serial_number || '', b.registration || '', b.purchase_date || null, b.purchase_price || 0, b.current_value || 0, b.condition, b.status, b.assigned_project_id || null, b.assigned_employee_id || null, b.location || '', b.last_service_date || null, b.next_service_date || null, b.notes || '', id]
      );
      return res.status(200).json(result.rows[0]);
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('assets [id] error', err);
    res.status(500).json({ error: String(err) });
  }
};
