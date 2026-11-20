import express from 'express';
export default function createCategoriesRouter(pool) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json(result.rows);
  });
  return router;
}
