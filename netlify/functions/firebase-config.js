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


        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID,
            measurementId: process.env.FIREBASE_MEASUREMENT_ID
        };


        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block'
                },
                body: JSON.stringify({
                    error: true,
                    message: 'Firebase configuration incomplete'
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({
                success: true,
                config: firebaseConfig
            })
        };

    } catch (error) {
        console.error('Firebase config function error:', error);
        return security.createSecurityResponse(500, 'Internal server error');
    }
}); 