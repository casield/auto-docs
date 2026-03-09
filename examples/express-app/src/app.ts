import express from 'express';
import { loggingMiddleware, errorHandler } from './middleware/auth';
import apiRoutes from './routes/api';

export function createApp() {
    const app = express();

    // Global middleware
    app.use(express.json());
    app.use(loggingMiddleware);

    // API routes
    app.use('/api', apiRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ error: 'Route not found' });
    });

    // Error handler
    app.use(errorHandler);

    return app;
}
