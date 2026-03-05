import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) throw new AppError('Введите логин и пароль');

    const user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [{ phone: login }, { email: login }],
      },
    });

    if (!user) throw new AppError('Неверный логин или пароль', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Неверный логин или пароль', 401);

    const accessToken = signAccessToken({ id: user.id, role: user.role, name: user.name });
    const refreshToken = signRefreshToken({ id: user.id });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh токен не предоставлен', 401);

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.id, isActive: true },
      select: { id: true, role: true, name: true, phone: true },
    });

    if (!user) throw new AppError('Пользователь не найден', 401);

    const accessToken = signAccessToken({ id: user.id, role: user.role, name: user.name });

    res.json({ accessToken });
  } catch {
    next(new AppError('Неверный refresh токен', 401));
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
        captainBoat: { include: { boat: true } },
        captainRate: true,
        dispatcherRate: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
