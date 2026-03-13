import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import boatRoutes from './boats';
import pierRoutes from './piers';
import tripRoutes from './trips';
import expenseRoutes from './expenses';
import ratesRoutes from './rates';
import financeRoutes from './finance';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/boats', boatRoutes);
router.use('/piers', pierRoutes);
router.use('/trips', tripRoutes);
router.use('/expenses', expenseRoutes);
router.use('/rates', ratesRoutes);
router.use('/finance', financeRoutes);

export default router;
