/**
 * backend/src/app.ts
 * ─────────────────────────────────────────────────────────────────
 * Express app factory — separated from server startup so the app
 * can be imported in tests without calling app.listen().
 *
 * index.ts imports this and calls app.listen() + startScheduler().
 * ─────────────────────────────────────────────────────────────────
 */

import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { authMiddleware } from './middleware/auth';
import { sanitizeBody } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import aggregatorsRouter from './routes/aggregators';
import usersRouter from './routes/users';
import ordersRouter from './routes/orders';
import ratesRouter from './routes/rates';
import messagesRouter from './routes/messages';
import ratingsRouter from './routes/ratings';
import disputesRouter from './routes/disputes';
import notificationsRouter from './routes/notifications';
import realtimeRouter from './routes/realtime';
import addressesRouter from './routes/addresses';
import mapsRouter from './routes/maps';
import scrapRouter from './routes/scrap';
import adminRouter from './routes/admin';
import adminAuthRouter from './routes/admin-auth';

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
  : [];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ strict: true, limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeBody);

app.post('/test/sanitize', (req, res) => res.json({ body: req.body }));

// Public auth routes
app.use('/api/auth', authRouter);

app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
}));

// Serve static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(authMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clerk: !!process.env.CLERK_SECRET_KEY && !!process.env.CLERK_PUBLISHABLE_KEY ? 'configured' : 'MISSING ⚠️',
  });
});

app.use('/api/orders', ordersRouter);
app.use('/api/aggregators', aggregatorsRouter);
app.use('/api/users', usersRouter);
app.use('/api/sellers/addresses', addressesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/scrap', scrapRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/disputes', disputesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/realtime', realtimeRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

export default app;
