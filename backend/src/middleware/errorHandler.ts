import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Error:', err);

    // Sentry error tracking with env scrubbing (D3)
    Sentry.withScope((scope) => {
        // We intentionally don't attach raw process.env or sensitive config
        scope.clear();
        Sentry.captureException(err);
    });

    const statusCode = err.status || err.statusCode || 500;

    if (process.env.NODE_ENV === 'production') {
        // Do not mask 4xx client errors as 500 Internal Server Errors
        const message = (statusCode >= 400 && statusCode < 500) 
            ? (err.message || 'Client Error') 
            : 'Internal Server Error';
            
        res.status(statusCode).json({ error: message });
    } else {
        // In dev, sometimes it outputs a helpful stack or message
        res.status(statusCode).json({ error: err.message || 'Internal Server Error', stack: err.stack });
    }
};
