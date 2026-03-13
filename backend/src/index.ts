import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import './instrument'; // V14/D3: Must be first
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { sanitizeBody } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import aggregatorsRouter from './routes/aggregators';
import usersRouter from './routes/users';
import { startScheduler } from './scheduler';

const app = express();

console.log('[DIAG] Backend initializing...');
console.log('[DIAG] env.PORT:', process.env.PORT);
console.log('[DIAG] env.DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('[DIAG] env.CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? `${process.env.CLERK_SECRET_KEY.slice(0, 8)}...` : 'MISSING');
console.log('[DIAG] env.CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? `${process.env.CLERK_PUBLISHABLE_KEY.slice(0, 8)}...` : 'MISSING');

// 1. V34: helmet() MUST be the very first middleware
app.use(helmet());

// 2. X1: CORS middleware based on ALLOWED_ORIGINS env var, with no wildcards
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
  : [];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// 3. Body parsing: express.json() with strict: true and a 10kb limit
app.use(express.json({ strict: true, limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. Sanitize all incoming JSON HTML tags
app.use(sanitizeBody);

// Test route for G6.4
app.post('/test/sanitize', (req, res) => res.json({ body: req.body }));

// Auth router mounted BEFORE global Clerk JWT middleware.
// /api/auth/* routes are public — request-otp and verify-otp bypass Clerk.
// The authMiddleware exemption list (path.startsWith('/api/auth/')) already covers these.
app.use('/api/auth', authRouter); // PUBLIC routes — no Clerk JWT

// 5. Auth Middleware
app.use(authMiddleware);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// APIs will be mounted here later
app.get('/api/orders', (req, res) => res.json({ success: true }));
app.use('/api/aggregators', aggregatorsRouter);
app.use('/api/users', usersRouter);


// 6. Global error handler MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startScheduler();
});
