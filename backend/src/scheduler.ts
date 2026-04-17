import cron from 'node-cron';
import { query } from './lib/db';
import * as Sentry from '@sentry/node';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { publishEvent } from './lib/realtime';

const INDIA_TIMEZONE = 'Asia/Kolkata';

function resolveScraperPath(): string {
    const candidates = [
        path.resolve(process.cwd(), 'scraper', 'main.py'),
        path.resolve(process.cwd(), '..', 'scraper', 'main.py'),
        path.resolve(__dirname, '..', '..', 'scraper', 'main.py'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return candidates[0];
}

async function runPriceScraperAndRefreshView() {
    await new Promise<void>((resolve, reject) => {
        const pythonBin = process.env.PYTHON_BIN || 'python';
        const scraperPath = resolveScraperPath();
        const child = spawn(pythonBin, [scraperPath], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';

        child.stdout.on('data', (chunk) => {
            console.log(`[Scheduler][PriceScraper] ${String(chunk).trim()}`);
        });

        child.stderr.on('data', (chunk) => {
            const text = String(chunk);
            stderr += text;
            console.error(`[Scheduler][PriceScraper][stderr] ${text.trim()}`);
        });

        child.on('error', (error) => {
            reject(error);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            const error = new Error(`Price scraper exited with code ${code}. ${stderr}`.trim());
            reject(error);
        });
    });

    await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index`);

    try {
        await publishEvent('rates:hyd:index', 'rates_updated', {
            city_code: 'HYD',
            source: 'ai_scraper',
            updated_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[Scheduler] Failed to publish rates_updated event', err);
    }
}

// Define the jobs and their queries
const jobs = [
    {
        name: 'Aggregator Online Culling',
        schedule: '*/5 * * * *', // Every 5 minutes
        task: async () => {
            await query(`
        UPDATE aggregator_availability
        SET is_online = false
        WHERE last_ping_at < NOW() - INTERVAL '5 minutes'
          AND is_online = true
      `);
        },
    },
    {
        name: 'Rating Stats Refresh',
        schedule: '*/15 * * * *', // Every 15 minutes
        task: async () => {
            await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats`);
        },
    },
    {
        name: 'Price Scraper (Python Spawn)',
        schedule: '0 0 * * *',
        task: async () => {
            await runPriceScraperAndRefreshView();
        },
    },
    {
        name: 'OTP Log Cleanup',
        schedule: '0 2 * * *', // Every day at 02:00
        task: async () => {
            await query(`
        DELETE FROM otp_log
        WHERE expires_at < NOW() - INTERVAL '7 days'
      `);
        },
    },
    {
        name: 'Message Partition Creation',
        schedule: '0 1 25 * *', // 25th of every month at 01:00
        task: async () => {
            await createNextMonthMessagePartition();
        },
    },
    {
        name: 'Ably Connection Monitor',
        schedule: '*/5 * * * *', // Every 5 minutes
        task: async () => {
            try {
                // Day 14: direct Ably SDK usage removed from backend app code.
                // Connection monitoring can be reintroduced via @sortt/realtime provider metrics.
                if (process.env.ABLY_API_KEY) {
                    Sentry.captureMessage('Ably connection monitor skipped: provider metrics adapter pending', 'info');
                }
            } catch (err) {
                Sentry.captureException(err, { tags: { cron_job: 'ably_connection_monitor' } });
            }
        },
    },
];

async function createNextMonthMessagePartition() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const year = nextMonth.getFullYear();
    const month = (nextMonth.getMonth() + 1).toString().padStart(2, '0');
    const partitionName = `messages_${year}_${month}`;

    // Find start and end dates for the next month
    const startDate = `${year}-${month}-01`;
    const nextMonthAfterThat = new Date(nextMonth);
    nextMonthAfterThat.setMonth(nextMonthAfterThat.getMonth() + 1);
    const nextYear = nextMonthAfterThat.getFullYear();
    const nextMonthStr = (nextMonthAfterThat.getMonth() + 1).toString().padStart(2, '0');
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    // Create partition if it doesn't already exist
    await query(`
    CREATE TABLE IF NOT EXISTS ${partitionName}
    PARTITION OF messages
    FOR VALUES FROM ('${startDate}') TO ('${endDate}')
  `);
}

export function startScheduler() {
    console.log('Starting node-cron scheduler...');

    for (const job of jobs) {
        cron.schedule(job.schedule, async () => {
            console.log(`[Scheduler] Running job: ${job.name}`);
            try {
                await job.task();
                console.log(`[Scheduler] Completed job: ${job.name}`);
            } catch (error) {
                console.error(`[Scheduler] Failed job: ${job.name}`, error);
                Sentry.captureException(error, { tags: { job: job.name } });
            }
        }, { timezone: INDIA_TIMEZONE });
    }

    // Run the partition creation job once synchronously on startup
    createNextMonthMessagePartition().catch(err => {
        console.error(`[Scheduler] Failed synchronous startup job: Message Partition Creation`, err);
        Sentry.captureException(err, { tags: { job: 'Message Partition Creation (Startup)' } });
    });

    // Run once at startup if price index is stale (or empty), so admin/mobile don't wait for next daily cron.
    (async () => {
        try {
            const freshness = await query(`SELECT MAX(scraped_at) AS last_scraped_at FROM price_index`);
            const raw = freshness.rows?.[0]?.last_scraped_at;
            const lastScrapedAt = raw ? new Date(raw) : null;
            const isStale = !lastScrapedAt || (Date.now() - lastScrapedAt.getTime()) > (24 * 60 * 60 * 1000);

            if (isStale) {
                console.log('[Scheduler] Price index is stale/empty. Running immediate scraper refresh...');
                await runPriceScraperAndRefreshView();
                console.log('[Scheduler] Immediate scraper refresh completed.');
            }
        } catch (err) {
            console.error('[Scheduler] Startup price refresh failed', err);
            Sentry.captureException(err, { tags: { job: 'Price Scraper (Startup)' } });
        }
    })();
}
