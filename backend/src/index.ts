import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import './instrument';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'; // ADD THIS
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
import { startScheduler } from './scheduler';

const app = express();

console.log('[DIAG] Backend initializing...');
console.log('[DIAG] env.PORT:', process.env.PORT);
console.log('[DIAG] env.DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DIAG] env.CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? `${process.env.CLERK_SECRET_KEY.slice(0, 8)}...` : 'MISSING');
console.log('[DIAG] env.CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? `${process.env.CLERK_PUBLISHABLE_KEY.slice(0, 8)}...` : 'MISSING');

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

// Public auth routes — before any Clerk middleware
app.use('/api/auth', authRouter);

// clerkMiddleware() populates req.auth so getAuth() works in route handlers.
// Does NOT enforce auth or redirect — your authMiddleware handles enforcement.
app.use(clerkMiddleware()); // ADD THIS — must come before authMiddleware

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Custom authMiddleware: verifies token via createClerkClient().verifyToken(),
// returns 401 (never redirects), exempts /api/auth/* and /api/rates
app.use(authMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.use(errorHandler);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startScheduler();
});