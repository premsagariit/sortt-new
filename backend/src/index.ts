import 'dotenv/config';
import './instrument'; // V14/D3: Must be first
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { sanitizeBody } from './middleware/sanitize';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// 1. V34: helmet() MUST be the very first middleware
app.use(helmet());

// 2. X1: CORS middleware based on ALLOWED_ORIGINS env var, with no wildcards
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
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

// 5. Auth Middleware
app.use(authMiddleware);

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// APIs will be mounted here later
app.get('/api/orders', (req, res) => res.json({ success: true }));


// 6. Global error handler MUST be last
app.use(errorHandler);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
