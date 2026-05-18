const { authorize } = require('../_auth');
const db = require('../_db');

module.exports = async (req, res) => {
  if (!(await authorize(req, res))) return;

  const id = req.url?.split('/').pop();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    if (req.method === 'GET') {
      const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const b = req.body;
      const updateSql = `UPDATE projects SET name=$1, description=$2, client_name=$3, client_email=$4, client_phone=$5, address=$6, city=$7, state=$8, postcode=$9, cost_code=$10, status=$11, budget=$12, contract_value=$13, start_date=$14, end_date=$15, manager_id=$16 WHERE id=$17 RETURNING *`;
      const params = [b.name, b.description, b.client_name, b.client_email, b.client_phone, b.address, b.city, b.state, b.postcode, b.cost_code, b.status, b.budget || 0, b.contract_value || 0, b.start_date, b.end_date, b.manager_id, id];
      const result = await db.query(updateSql, params);
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      await db.query('DELETE FROM projects WHERE id = $1', [id]);
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('projects id error', err);
    res.status(500).json({ error: String(err) });
  }
};
