import express from 'express';
export default function createUsersRouter(repository) {
  const router = express.Router();
  router.get('/', async (req, res) => res.json(await repository.findAll()));
  router.post('/', async (req, res) => {
    const { displayName } = req.body ?? {};
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 100) {
      return res.status(400).json({ message: 'displayName: строка длиной 1–100 символов' });
    }
    return res.status(201).json(await repository.add(displayName.trim()));
  });
  return router;
}
