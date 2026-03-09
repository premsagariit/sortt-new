import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Graceful fallback if env vars missing
export const redis = url && token ? new Redis({ url, token }) : null;

// Helper to create rate limiters
const createLimiter = (options: any) => {
    return redis ? new Ratelimit({ redis, ...options }) : null;
};

export const otpRequestLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(3, '1 d'), // 3 per day
    prefix: '@upstash/ratelimit/otp_request',
});

export const otpVerifyLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 per hour
    prefix: '@upstash/ratelimit/otp_verify',
});

export const analyzeRateLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(10, '1 d'), // 10 per day
    prefix: '@upstash/ratelimit/analyze',
});

export const orderCreateLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(5, '1 d'), // 5 per day
    prefix: '@upstash/ratelimit/order_create',
});

export const globalGeminiCounter = createLimiter({
    limiter: Ratelimit.fixedWindow(100, '30 d'), // Global usage context
    prefix: '@upstash/ratelimit/gemini_global',
});
