import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import './instrument';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
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
import { startScheduler } from './scheduler';

// ── Startup environment validation ─────────────────────────────────────────
// Must happen before any middleware or route registration so that missing env
// vars produce a single clear error at boot rather than cryptic per-request
// crashes from auth internals.
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

const missingVars = REQUIRED_ENV_VARS.filter((k) => !process.env[k]);
if (missingVars.length > 0) {
  console.error(
    `[FATAL] Missing required environment variables: ${missingVars.join(', ')}.\n` +
    `Set them as Azure App Service Application Settings (Configuration → Application settings).\n` +
    `The server will start but ALL authenticated routes will return 503 until this is fixed.`
  );
}

const app = express();

console.log('[DIAG] Backend initializing...');
console.log('[DIAG] env.PORT:', process.env.PORT);
console.log('[DIAG] env.NODE_ENV:', process.env.NODE_ENV);
console.log('[DIAG] env.DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DIAG] env.JWT_SECRET configured:', !!process.env.JWT_SECRET);
console.log('[DIAG] env.ABLY_API_KEY exists:', !!process.env.ABLY_API_KEY);
console.log('[DIAG] env.R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || 'MISSING ⚠️');

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
  : [];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In dev mode, allow all local networks/localhost dynamically, or explicitly whitelisted ones
    const isLocalhost = origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1') || origin?.startsWith('http://192.168.');
    
    if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && isLocalhost)) {
      callback(null, true);
    } else {
      // Returning false instead of new Error() prevents Express from crashing the Node process
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(express.json({ strict: true, limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitizeBody);

app.post('/test/sanitize', (req, res) => res.json({ body: req.body }));

// Public auth routes — before custom auth middleware so OTP endpoints never need a token
app.use('/api/auth', authRouter);
app.use('/api/admin/auth', adminAuthRouter);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Custom authMiddleware: verifies JWT via custom token logic,
// returns 401 (never redirects), exempts /api/auth/* and /api/rates
app.use(authMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    auth: 'custom-jwt',
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
app.use('/api/admin', adminRouter);


app.use(errorHandler);

export default app;

const PORT = process.env.PORT || 8080;

// Only start the server if this file is run directly (not in jest/test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startScheduler();
  });
}