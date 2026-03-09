import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
        return sanitizeHtml(value, {
            allowedTags: [],
            allowedAttributes: {},
        });
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const sanitizedObj: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            sanitizedObj[key] = sanitizeValue(value[key]);
        }
        return sanitizedObj;
    }
    return value;
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.body) {
            req.body = sanitizeValue(req.body);
        }
    } catch (error) {
        // Do not crash on errors per requirements
        console.error('Sanitization error:', error);
    }
    next();
};
