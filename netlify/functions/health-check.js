const SecurityMiddleware = require('./security-middleware');
const security = new SecurityMiddleware();

exports.handler = security.middleware(async (event, context) => {
    try {

        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: 'Method not allowed'
                })
            };
        }

       
        const requiredVars = [
            'FIREBASE_API_KEY',
            'FIREBASE_AUTH_DOMAIN',
            'FIREBASE_PROJECT_ID',
            'FIREBASE_STORAGE_BUCKET',
            'FIREBASE_MESSAGING_SENDER_ID',
            'FIREBASE_APP_ID'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);

        const healthStatus = {
            status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            services: {
                firebase: {
                    status: missingVars.length === 0 ? 'configured' : 'misconfigured',
                    missing_variables: missingVars
                },
                security: {
                    status: 'active',
                    middleware: 'enabled'
                }
            },
            recommendations: []
        };

        if (missingVars.length > 0) {
            healthStatus.recommendations.push(
                `Missing Firebase environment variables: ${missingVars.join(', ')}`
            );
            healthStatus.recommendations.push(
                'Please set these variables in your Netlify dashboard'
            );
        }

        const statusCode = missingVars.length === 0 ? 200 : 503;

        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify(healthStatus)
        };

    } catch (error) {
        console.error('Health check error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            },
            body: JSON.stringify({
                status: 'error',
                message: 'Health check failed',
                error: error.message
            })
        };
    }
}); 