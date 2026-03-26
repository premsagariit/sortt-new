import cron from 'node-cron';
import { query } from './lib/db';
import * as Sentry from '@sentry/node';
import path from 'path';
import { spawn } from 'child_process';

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
            await new Promise<void>((resolve, reject) => {
                const pythonBin = process.env.PYTHON_BIN || 'python';
                const scraperPath = path.resolve(process.cwd(), 'scraper', 'main.py');
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
        },
    },
    {
        name: 'Price Index Refresh',
        schedule: '30 0 * * *', // Every day at 00:30
        task: async () => {
            await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index`);
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
        });
    }

    // Run the partition creation job once synchronously on startup
    createNextMonthMessagePartition().catch(err => {
        console.error(`[Scheduler] Failed synchronous startup job: Message Partition Creation`, err);
        Sentry.captureException(err, { tags: { job: 'Message Partition Creation (Startup)' } });
    });
}
