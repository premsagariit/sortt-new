import cron from 'node-cron';
import { query } from './lib/db';
import * as Sentry from '@sentry/node';
import Ably from 'ably';

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
            const key = process.env.ABLY_API_KEY;
            if (!key) return;

            try {
                const ablyRest = new Ably.Rest({ key });
                const stats = await ablyRest.stats({ unit: 'minute', limit: 1 });
                const firstItem = stats.items?.[0] as unknown as { connections?: { peak?: number } } | undefined;
                const connections = firstItem?.connections?.peak ?? 0;

                // Alert at 150 connections (75% of 200 free limit)
                if (connections >= 150) {
                    Sentry.captureMessage(
                        `Ably connection ceiling approaching: ${connections}/200`,
                        'warning'
                    );
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
