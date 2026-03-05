import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initScheduler } from './services/schedulerService';

const app = express();
const httpServer = createServer(app);

export const prisma = new PrismaClient();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

export const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8081', corsOrigin],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:8081',
      corsOrigin,
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  const role = socket.handshake.query.role as string;
  if (role) {
    socket.join(`role:${role}`);
  }
  const userId = socket.handshake.query.userId as string;
  if (userId) {
    socket.join(`user:${userId}`);
  }
  socket.on('disconnect', () => {});
});

const PORT = Number(process.env.PORT) || 3001;

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await prisma.$connect();
  console.log('✅ Database connected');
  initScheduler();
  console.log('⏰ Scheduler initialized');
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
