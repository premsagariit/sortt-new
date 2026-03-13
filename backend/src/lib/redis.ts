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
    limiter: Ratelimit.slidingWindow(200, '60 m'), // 200 per 60 mins
    prefix: 'order_create',
});

export const globalGeminiCounter = createLimiter({
    limiter: Ratelimit.fixedWindow(100, '30 d'), // Global usage context
    prefix: '@upstash/ratelimit/gemini_global',
});

// ----------------------------------------------------
// Day 7 New Limiters (keyed by phone hash)
// ----------------------------------------------------

export const otpRequestPhoneLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(200, '10 m'), // 20 per 10 mins for dev
    prefix: '@upstash/ratelimit/otp_request_phone',
});

export const otpVerifyPhoneLimiter = createLimiter({
    limiter: Ratelimit.slidingWindow(200, '10 m'), // 20 per 10 mins
    prefix: '@upstash/ratelimit/otp_verify_phone',
});

// Helper for Meta conversation counter
export const incrementMetaConvCount = async (monthKey: string): Promise<number> => {
    if (!redis) return 0;
    const key = `meta:conv_count:${monthKey}`;
    const count = await redis.incr(key);
    // Set TTL on first increment to cleanup automatically
    if (count === 1) {
        await redis.expire(key, 40 * 24 * 60 * 60); // 40 days
    }
    return count;
};

