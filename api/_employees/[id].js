const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const id = req.url?.split('/').pop();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM employees WHERE id = $1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const b = req.body;
      const updateSql = `UPDATE employees SET first_name=$1, last_name=$2, email=$3, phone=$4, role=$5, position=$6, hourly_rate=$7, employment_type=$8, start_date=$9, is_active=$10, emergency_contact_name=$11, emergency_contact_phone=$12 WHERE id=$13 RETURNING *`;
      const params = [
        b.first_name, b.last_name, b.email, b.phone, b.role, b.position, b.hourly_rate || 0, b.employment_type, b.start_date, b.is_active === undefined ? true : b.is_active, b.emergency_contact_name, b.emergency_contact_phone, id,
      ];
      const result = await db.query(updateSql, params);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      await db.query('DELETE FROM employees WHERE id = $1', [id]);
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('employees id error', err);
    res.status(500).json({ error: String(err) });
  }
};
