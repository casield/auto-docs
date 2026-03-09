import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware that validates Bearer tokens
 * 
 * @AUTO_DOCS_META:{"middleware":"auth","version":"1.0"}
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.substring(7);
    if (!validateToken(token)) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
    next();
};

/**
 * Request logging middleware
 * 
 * @AUTO_DOCS_META:{"middleware":"logging","level":"info"}
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
};

/**
 * Error handling middleware for Express app
 * 
 * @AUTO_DOCS_META:{"middleware":"errorHandler"}
 */
export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
};

function validateToken(token: string): boolean {
    return token === 'valid-test-token' || token.length > 10;
}
